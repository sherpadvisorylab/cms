export interface RenderInput {
  template: string;
  data: Record<string, unknown>;
  globals?: Record<string, unknown>;
}

export interface IRenderEngine {
  render(input: RenderInput): Promise<string>;
}
