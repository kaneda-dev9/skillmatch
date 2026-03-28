"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Document, Engineer } from "@/types";
import { FilePreview } from "./file-preview";

interface EngineerDetailProps {
  engineer: Engineer;
  document: Document | null;
  storageUrl: string;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
  expert: "エキスパート",
};

export function EngineerDetail({ engineer, document, storageUrl }: EngineerDetailProps) {
  return (
    <Tabs defaultValue="structured">
      <TabsList>
        <TabsTrigger value="structured">構造化情報</TabsTrigger>
        <TabsTrigger value="raw">原文テキスト</TabsTrigger>
        <TabsTrigger value="preview">ファイルプレビュー</TabsTrigger>
      </TabsList>

      <TabsContent value="structured" className="space-y-4 pt-4">
        {/* スキル */}
        <Card>
          <CardHeader>
            <CardTitle>スキル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {engineer.skills.map((skill) => (
                <Badge key={skill.name} variant="secondary">
                  {skill.name}（{LEVEL_LABELS[skill.level]}・{skill.years}年）
                </Badge>
              ))}
              {engineer.skills.length === 0 && (
                <p className="text-sm text-muted-foreground">未登録</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">経験年数</dt>
                <dd className="font-medium">{engineer.experience_years}年</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">メール</dt>
                <dd className="font-medium">{engineer.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">業界経験</dt>
                <dd className="font-medium">{engineer.industries.join(", ") || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">リモート</dt>
                <dd className="font-medium">{engineer.availability?.remote ? "可" : "不可"}</dd>
              </div>
              {engineer.availability?.rate_min && (
                <div>
                  <dt className="text-muted-foreground">単価</dt>
                  <dd className="font-medium">
                    {engineer.availability.rate_min?.toLocaleString()}〜
                    {engineer.availability.rate_max?.toLocaleString()}円
                  </dd>
                </div>
              )}
              {engineer.availability?.location && (
                <div>
                  <dt className="text-muted-foreground">勤務地</dt>
                  <dd className="font-medium">{engineer.availability.location}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* ソフトスキル */}
        {engineer.soft_skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ソフトスキル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {engineer.soft_skills.map((ss) => (
                  <Badge key={ss.name} variant="outline">
                    {ss.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="raw" className="pt-4">
        <Card>
          <CardContent className="pt-6">
            {engineer.raw_text ? (
              <pre className="max-h-[600px] overflow-auto text-sm whitespace-pre-wrap">
                {engineer.raw_text}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">原文テキストがありません</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preview" className="pt-4">
        <Card>
          <CardContent className="pt-6">
            <FilePreview document={document} storageUrl={storageUrl} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
