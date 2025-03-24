export class Logger {
  name = 'log';
  isEnabled = true;

  constructor(name: string, isEnabled: boolean) {
    this.name = name;
    this.isEnabled = isEnabled;
  }

  verbose = (msg?: any, ...optionalParams: any[]) => {
    this.isEnabled &&
      console.log(`[${this.name}:verbose]`, new Date().toISOString(), msg, ...optionalParams);
  };
  info = (msg?: any, ...optionalParams: any[]) => {
    this.isEnabled &&
      console.info(`[${this.name}:info]`, new Date().toISOString(), msg, ...optionalParams);
  };
  warn = (msg?: any, ...optionalParams: any[]) => {
    this.isEnabled &&
      console.warn(`[${this.name}:warn]`, new Date().toISOString(), msg, ...optionalParams);
  };
}
