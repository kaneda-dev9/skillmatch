"use client";

import type { Document } from "@/types";

interface FilePreviewProps {
  document: Document | null;
  storageUrl: string;
}

export function FilePreview({ document, storageUrl }: FilePreviewProps) {
  if (!document) {
    return <p className="text-sm text-muted-foreground">ファイルがアップロードされていません</p>;
  }

  const fileUrl = `${storageUrl}/storage/v1/object/public/documents/${document.file_path}`;

  if (document.file_type === "application/pdf") {
    return (
      <div className="space-y-3">
        <iframe
          src={fileUrl}
          className="h-[600px] w-full rounded-lg border"
          title={document.file_name}
        />
      </div>
    );
  }

  // Word/Excel はダウンロードリンク + テキスト表示
  return (
    <div className="space-y-4">
      <a
        href={fileUrl}
        download={document.file_name}
        className="inline-flex items-center gap-2 text-sm text-primary underline"
      >
        {document.file_name} をダウンロード
      </a>
      {document.parsed_content && (
        <pre className="max-h-[500px] overflow-auto rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
          {document.parsed_content}
        </pre>
      )}
    </div>
  );
}
