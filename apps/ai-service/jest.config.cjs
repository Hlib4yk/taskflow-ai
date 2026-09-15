/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  // @nestjs/bullmq and @nestjs/bull-shared ship ESM-only (no CJS build) —
  // let ts-jest transpile them too instead of Jest's default of skipping
  // everything under node_modules. pnpm nests the real package under
  // node_modules/.pnpm/<name>@<version>/node_modules/<name>, hence matching
  // against the flattened ".pnpm" directory name rather than "<name>/".
  transformIgnorePatterns: ["node_modules/\\.pnpm/(?!(@nestjs\\+bullmq|@nestjs\\+bull-shared)@)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": ["ts-jest", { isolatedModules: true, tsconfig: { allowJs: true } }],
  },
};
