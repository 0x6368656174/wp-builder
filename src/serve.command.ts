export const command = 'serve';
export const describe = 'Run site local';
export function handler() {
  console.log("serve site run");
  process.exit(1);
}
