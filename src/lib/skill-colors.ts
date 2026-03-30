const SKILL_COLORS: Record<string, string> = {
  // Frontend
  React: "#61dafb",
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  "Next.js": "#000000",
  "Vue.js": "#42b883",
  Vue: "#42b883",
  "Tailwind CSS": "#06b6d4",
  Figma: "#f24e1e",
  HTML: "#e34f26",
  CSS: "#1572b6",
  Angular: "#dd0031",
  Svelte: "#ff3e00",
  // Backend
  Python: "#3776ab",
  Django: "#092e20",
  Java: "#b07220",
  "Spring Boot": "#6db33f",
  Go: "#00add8",
  "Node.js": "#68a063",
  NestJS: "#e0234e",
  PHP: "#4f5b93",
  Ruby: "#cc342d",
  Rails: "#cc0000",
  Laravel: "#ff2d20",
  Rust: "#ce422b",
  "C#": "#239120",
  ".NET": "#512bd4",
  Kotlin: "#7f52ff",
  Swift: "#f05138",
  // Infra / Cloud
  AWS: "#ff9900",
  GCP: "#4285f4",
  Azure: "#0078d4",
  Docker: "#2496ed",
  Kubernetes: "#326ce5",
  Terraform: "#7b42bc",
  Linux: "#fcc624",
  // Database
  PostgreSQL: "#336791",
  MySQL: "#4479a1",
  MongoDB: "#47a248",
  Redis: "#dc382d",
  Firebase: "#ff6818",
  // Other
  Git: "#f05032",
  GraphQL: "#e10098",
  "React Native": "#61dafb",
}

const DEFAULT_COLOR = "#0d9488"

export function getSkillColor(skillName: string): {
  bg: string
  text: string
  border: string
} {
  const color = SKILL_COLORS[skillName] ?? DEFAULT_COLOR

  return {
    bg: `${color}18`,
    text: color,
    border: `${color}40`,
  }
}
