// Storage adapters
export type { StorageAdapter } from "./adapters/StorageAdapter";
export { InMemoryAdapter } from "./adapters/InMemoryAdapter";
export { LocalStorageAdapter } from "./adapters/LocalStorageAdapter";
export { LiquidRenderEngine } from "./adapters/LiquidRenderEngine";

// Repositories (all accept StorageAdapter via constructor)
export { PageRepository, PageVersionRepository } from "./repositories/PageRepository";
export { ComponentRepository, ComponentVersionRepository } from "./repositories/ComponentRepository";
export { MenuRepository } from "./repositories/MenuRepository";
export { AreaRepository } from "./repositories/AreaRepository";
export { TemplateRepository } from "./repositories/TemplateRepository";
export { EmailTemplateRepository } from "./repositories/EmailTemplateRepository";
export { NavigationRepository } from "./repositories/NavigationRepository";
export { SettingsRepository } from "./repositories/SettingsRepository";
export { UserRepository } from "./repositories/UserRepository";
export { FormRepository } from "./repositories/FormRepository";

// Email system
export type { IEmailSender, EmailMessage, EmailAttachment } from "./email/IEmailSender";
export { EmailTemplateEngine } from "./email/EmailTemplateEngine";
export { ConsoleEmailSender } from "./email/ConsoleEmailSender";

// Utilities
export { generateId } from "./utils/storage";
