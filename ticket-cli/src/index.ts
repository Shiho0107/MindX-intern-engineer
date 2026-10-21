#!/usr/bin/env node

import { createCli } from './cli.js';

const { run } = createCli();

run(process.argv).catch(err => {
  console.error('Unexpected CLI error:', err);
  process.exit(1);
});
