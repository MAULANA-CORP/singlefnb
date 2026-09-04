import { redirect } from "next/navigation";
export default function OldProduksiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  redirect("/produksi/proses");
}
