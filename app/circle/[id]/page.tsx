import CircleView from "@/components/CircleView";
export default function Page({ params }: { params: { id: string } }) { return <CircleView id={params.id} />; }
