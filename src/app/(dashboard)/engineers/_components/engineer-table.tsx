"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Engineer } from "@/types"

interface EngineerTableProps {
  engineers: Engineer[]
}

export function EngineerTable({ engineers }: EngineerTableProps) {
  if (engineers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>エンジニアが登録されていません</p>
        <Link href="/engineers/new" className="mt-2 text-primary underline">
          エンジニアを登録する
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>スキル</TableHead>
            <TableHead>経験年数</TableHead>
            <TableHead>業界</TableHead>
            <TableHead>リモート</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {engineers.map((engineer) => (
            <TableRow key={engineer.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link
                  href={`/engineers/${engineer.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {engineer.name}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {engineer.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill.name} variant="secondary">
                      {skill.name}
                    </Badge>
                  ))}
                  {engineer.skills.length > 3 && (
                    <Badge variant="outline">+{engineer.skills.length - 3}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{engineer.experience_years}年</TableCell>
              <TableCell>{engineer.industries.join(", ") || "-"}</TableCell>
              <TableCell>{engineer.availability?.remote ? "可" : "-"}</TableCell>
              <TableCell>{new Date(engineer.created_at).toLocaleDateString("ja-JP")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
