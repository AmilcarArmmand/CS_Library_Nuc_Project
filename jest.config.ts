import type { JestConfigWithTsJest } from "ts-jest";
import { pathsToModuleNameMapper } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  verbose: true,
  globalSetup: "<rootDir>/test/global-setup.ts",
  preset: "ts-jest/presets/default-esm",
  moduleNameMapper: {
    "^(\\.{1,2}/.+)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(supertest|superagent)/)",
  ],
  extensionsToTreatAsEsm: [".ts"],
};

export default jestConfig;
