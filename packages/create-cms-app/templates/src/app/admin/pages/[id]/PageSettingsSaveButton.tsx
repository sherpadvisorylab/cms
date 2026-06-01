"use client";

export function PageSettingsSaveButton() {
  function handleClick() {
    // 1. Save schema (PageSchemaEditor listens for this event)
    window.dispatchEvent(new CustomEvent("cms:save-page-schema"));
    // 2. Submit the settings form
    (document.getElementById("settings-form") as HTMLFormElement)?.requestSubmit();
  }

  return (
    <button className="btn btn-primary" onClick={handleClick}>
      💾 Save Settings
    </button>
  );
}
