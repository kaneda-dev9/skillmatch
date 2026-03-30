-- pgvector cosine 類似度でエンジニアを検索する RPC
CREATE OR REPLACE FUNCTION match_engineers(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  skills jsonb,
  experience_years int,
  industries text[],
  availability jsonb,
  soft_skills jsonb,
  raw_text text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.name,
    e.email,
    e.skills,
    e.experience_years,
    e.industries,
    e.availability,
    e.soft_skills,
    e.raw_text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM engineers e
  WHERE e.org_id = match_org_id
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
