export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-[#0A0A0F] text-[#E8E8F0]">{children}</div>
}