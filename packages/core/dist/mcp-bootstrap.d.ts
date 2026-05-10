export interface McpConfig {
    mcpServers: Record<string, McpServer>;
}
export interface McpServer {
    command: string;
    args: string[];
}
export interface McpBootstrapOptions {
    orgAlias: string;
    toolsets?: string[];
    tools?: string[];
    allowNonGaTools?: boolean;
}
export interface McpBootstrapResult {
    cursorConfigPath: string;
    claudeConfigPath: string;
    config: McpConfig;
    alreadyExisted: {
        cursor: boolean;
        claude: boolean;
    };
}
export declare function buildMcpConfig(options: McpBootstrapOptions): McpConfig;
export declare function bootstrapMcp(rootPath: string, options: McpBootstrapOptions): Promise<McpBootstrapResult>;
/** Validate an existing MCP config and report issues */
export interface McpValidationResult {
    valid: boolean;
    issues: string[];
    suggestions: string[];
}
export declare function validateMcpConfig(configPath: string): Promise<McpValidationResult>;
//# sourceMappingURL=mcp-bootstrap.d.ts.map