"use client";

import { useEffect, useState } from "react";
import { PublishToggle } from "@/components/admin/PublishToggle";

interface Props {
  pageId:               string;
  initialIsPublished:   boolean;
  publishedVersionNumber: number | null;
  pageSlug:             string;
}

export function PageSettingsActions({
  pageId,
  initialIsPublished,
  publishedVersionNumber,
  pageSlug,
}: Props) {
  const [isDirty,      setIsDirty]      = useState(false);
  const [isPublished,  setIsPublished]  = useState(initialIsPublished);
  const [pubVerNum,    setPubVerNum]    = useState(publishedVersionNumber);

  // Watch the settings form for any input/change
  useEffect(() => {
    const form = document.getElementById("settings-form") as HTMLFormElement | null;
    if (!form) return;
    const mark = () => setIsDirty(true);
    form.addEventListener("input",  mark);
    form.addEventListener("change", mark);
    return () => { form.removeEventListener("input", mark); form.removeEventListener("change", mark); };
  }, []);

  function handleSave() {
    window.dispatchEvent(new CustomEvent("cms:save-page-schema"));
    const form = document.getElementById("settings-form") as HTMLFormElement | null;
    form?.requestSubmit();
    setIsDirty(false);
  }

  // canPublish: settings clean + page is not yet published (or was unpublished)
  const canPublish = !isDirty && !isPublished;

  return (
    <>
      {/* Save first — same position as "Save Content" in the content editor */}
      <button
        className="btn btn-primary btn-sm"
        onClick={handleSave}
        disabled={!isDirty}
        style={{ opacity: !isDirty ? 0.55 : 1 }}
        title={isDirty ? "Save pending settings changes" : "No unsaved changes"}
      >
        Save Settings
      </button>

      {/* Publish — same position as PublishToggle in the content editor */}
      <PublishToggle
        pageId={pageId}
        initialIsPublished={isPublished}
        canPublish={canPublish}
        publishedVersionNumber={pubVerNum}
        pageSlug={pageSlug}
        onToggle={(published, info) => {
          setIsPublished(published);
          if (info?.versionNumber) setPubVerNum(info.versionNumber);
          if (!published) setPubVerNum(null);
        }}
      />
    </>
  );
}
