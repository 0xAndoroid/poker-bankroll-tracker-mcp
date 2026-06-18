#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PbtApiClient } from "./api.js";
import { registerTools } from "./tools.js";

const apiKey = process.env.PBT_API_KEY;
if (!apiKey) {
  process.stderr.write("Error: PBT_API_KEY environment variable is required\n");
  process.exit(1);
}

const server = new McpServer({
  name: "poker-bankroll-tracker",
  version: "1.0.0",
});

const client = new PbtApiClient(apiKey);
registerTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
