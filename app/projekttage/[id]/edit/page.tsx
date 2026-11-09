import ProjectDayForm from "@/components/ProjectDayForm";

export default async function EditProjectDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDayForm dayId={id} />;
}
