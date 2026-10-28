#!/usr/bin/env node

import { createKbCli } from './cli.js';

const { run } = createKbCli();

run(process.argv).catch(err => {
  console.error('Unexpected KB CLI error:', err);
  process.exit(1);
});
