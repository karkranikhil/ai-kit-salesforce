import chalk from 'chalk';

export function header(text: string): void {
  console.log('');
  console.log(chalk.bold.cyan('AI-Kit for Salesforce'));
  console.log(chalk.gray('─'.repeat(50)));
  if (text) console.log(text);
}

export function success(msg: string): void {
  console.log(chalk.green('✓ ' + msg));
}

export function warn(msg: string): void {
  console.log(chalk.yellow('! ' + msg));
}

export function error(msg: string): void {
  console.log(chalk.red('✗ ' + msg));
}

export function info(msg: string): void {
  console.log(chalk.gray('  ' + msg));
}

export function bold(msg: string): void {
  console.log(chalk.bold(msg));
}

export function section(msg: string): void {
  console.log('');
  console.log(chalk.bold(msg));
}

export function item(msg: string): void {
  console.log('  ' + msg);
}
