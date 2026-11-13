import ProjectForm from "@/components/ProjectForm";

export default async function NewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectForm projectDayId={id} />;
}
