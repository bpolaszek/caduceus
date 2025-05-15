// RFC 6570 URI Template implementation
// Based on the specification: https://datatracker.ietf.org/doc/html/rfc6570

interface TemplateVariable {
  name: string;
  explode: boolean;
  prefix: number;
  operator: string;
}

// Define the interface for template variables
interface TemplateVariable {
  name: string;
  explode: boolean;
  prefix: number;
  operator: string;
}

export class UriTemplate {
  private readonly pattern: RegExp;
  private readonly variables: TemplateVariable[] = [];
  private readonly segments: string[] = [];

  constructor(
    private readonly uritemplate: string,
  ) {
    this.parseTemplate();
    this.pattern = this.createMatchPattern();
  }

  private parseTemplate(): void {
    const regex = /\{([+#./;?&]?)([^{}]+)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(this.uritemplate)) !== null) {
      // Add a text segment before the variable
      if (match.index > lastIndex) {
        this.segments.push(this.uritemplate.substring(lastIndex, match.index));
      }

      // Parse the variable
      const operator = match[1];
      const varNames = match[2].split(',');

      for (const varSpec of varNames) {
        let name = varSpec;
        let explode = false;
        let prefix = 0;

        // Check for explode modifier (*)
        if (name.endsWith('*')) {
          name = name.substring(0, name.length - 1);
          explode = true;
        }

        // Check for prefix modifier (:num)
        const prefixMatch = name.match(/^([^:]+):(\d+)$/);
        if (prefixMatch) {
          name = prefixMatch[1];
          prefix = parseInt(prefixMatch[2], 10);
        }

        this.variables.push({
          name,
          explode,
          prefix,
          operator
        });
      }

      // Add a placeholder for the variable position
      this.segments.push(`{${this.variables.length - 1}}`);
      lastIndex = regex.lastIndex;
    }

    // Add the final segment
    if (lastIndex < this.uritemplate.length) {
      this.segments.push(this.uritemplate.substring(lastIndex));
    }
  }

  private createMatchPattern(): RegExp {
    let patternString = this.uritemplate
      // Escape regex special characters
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Replace template expressions with capture groups
      .replace(/\{([+#./;?&]?)([^{}]+)\}/g, (_, operator, _varSpec) => {
        // Create different patterns based on the operator
        switch (operator) {
          case '':
            return '([^/]+)';  // Simple variable
          case '+':
            return '(.+)';     // Reserved expansion
          case '#':
            return '(#.+)';    // Fragment identifier
          case '.':
            return '(\\..+)';  // Dot prefixed
          case '/':
            return '(/[^/]*)'; // Path segments
          case '?':
            return '(\\?[^#]*)'; // Query
          case '&':
            return '(&.+)';    // Query continuation
          case ';':
            return '(;.+)';    // Path-style parameters
          default:
            return '([^/]+)';  // Default case
        }
      });

    return new RegExp(`^${patternString}$`);
  }

  isMatchedBy(uri: string): boolean {
    return this.pattern.test(uri);
  }

  expand(variables: Record<string, any>): string {
    let result = '';

    for (const segment of this.segments) {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        const variableIndex = parseInt(segment.substring(1, segment.length - 1), 10);
        const variable = this.variables[variableIndex];

        // Skip if the variable doesn't exist in the provided variables
        if (!variables || !(variable.name in variables) || variables[variable.name] === undefined || variables[variable.name] === null) {
          continue;
        }

        result += this.expandVariable(variable, variables[variable.name]);
      } else {
        result += segment;
      }
    }

    return result;
  }

  private expandVariable(variable: TemplateVariable, value: any): string {
    // Handle arrays and objects differently
    const isArray = Array.isArray(value);
    const isObject = !isArray && typeof value === 'object';

    // Apply prefix if specified and value is a string
    let processedValue = value;
    if (variable.prefix > 0 && typeof value === 'string') {
      processedValue = value.substring(0, variable.prefix);
    }

    // Encode the value based on the operator
    switch (variable.operator) {
      case '+': // Reserved expansion
        return this.encodeReserved(processedValue, variable.explode, isArray, isObject);
      case '#': // Fragment identifier
        return '#' + this.encodeReserved(processedValue, variable.explode, isArray, isObject);
      case '.': // Dot prefixed
        return '.' + this.encodeValue(processedValue, variable.explode, isArray, isObject, '.');
      case '/': // Path segments
        return '/' + this.encodeValue(processedValue, variable.explode, isArray, isObject, '/');
      case '?': // Query
        return '?' + variable.name + '=' + this.encodeValue(processedValue, variable.explode, isArray, isObject, '&');
      case '&': // Query continuation
        return '&' + variable.name + '=' + this.encodeValue(processedValue, variable.explode, isArray, isObject, '&');
      case ';': // Path-style parameters
        return ';' + variable.name + '=' + this.encodeValue(processedValue, variable.explode, isArray, isObject, ';');
      default: // Simple string expansion
        return this.encodeValue(processedValue, variable.explode, isArray, isObject, ',');
    }
  }

  private encodeValue(value: any, explode: boolean, isArray: boolean, isObject: boolean, separator: string): string {
    if (isArray) {
      if (explode) {
        return value.map((v: any) => `${encodeURIComponent(String(v))}`).join(separator);
      } else {
        return value.map((v: any) => encodeURIComponent(String(v))).join(',');
      }
    } else if (isObject) {
      const parts: string[] = [];
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (explode) {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value[key]))}`);
          } else {
            parts.push(`${encodeURIComponent(key)},${encodeURIComponent(String(value[key]))}`);
          }
        }
      }
      return parts.join(explode ? separator : ',');
    } else {
      return encodeURIComponent(String(value));
    }
  }

  private encodeReserved(value: any, explode: boolean, isArray: boolean, isObject: boolean): string {
    // Same as encodeValue but preserves reserved characters
    const encoder = (str: string) => {
      return encodeURI(str).replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%3F/g, '?')
        .replace(/%23/g, '#').replace(/%5B/g, '[').replace(/%5D/g, ']')
        .replace(/%40/g, '@').replace(/%21/g, '!').replace(/%24/g, '$')
        .replace(/%26/g, '&').replace(/%27/g, "'").replace(/%28/g, '(')
        .replace(/%29/g, ')').replace(/%2A/g, '*').replace(/%2B/g, '+')
        .replace(/%2C/g, ',').replace(/%3B/g, ';').replace(/%3D/g, '=');
    };

    if (isArray) {
      if (explode) {
        return value.map((v: any) => encoder(String(v))).join(',');
      } else {
        return value.map((v: any) => encoder(String(v))).join(',');
      }
    } else if (isObject) {
      const parts: string[] = [];
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (explode) {
            parts.push(`${encoder(key)}=${encoder(String(value[key]))}`);
          } else {
            parts.push(`${encoder(key)},${encoder(String(value[key]))}`);
          }
        }
      }
      return parts.join(explode ? ',' : ',');
    } else {
      return encoder(String(value));
    }
  }
}

export default UriTemplate;
