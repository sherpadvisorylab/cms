import { Liquid } from "liquidjs";
import type { IRenderEngine, RenderInput } from "@cms/domain";

const engine = new Liquid({
  strictVariables: false,
  strictFilters: false,
});

/**
 * LiquidJS-based render engine for CMS templates.
 * Merges globals and data into a single context for rendering.
 */
export class LiquidRenderEngine implements IRenderEngine {
  async render(input: RenderInput): Promise<string> {
    const context = { ...input.globals, ...input.data };
    return engine.parseAndRender(input.template, context);
  }
}
