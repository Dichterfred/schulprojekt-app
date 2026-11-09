import ProjectForm from "@/components/ProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  const { id, projectId } = await params;
  return <ProjectForm projectDayId={id} projectId={projectId} />;
}
