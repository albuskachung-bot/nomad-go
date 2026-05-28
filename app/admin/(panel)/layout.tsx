export default function AdminPanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TEMPORARY DEBUG BYPASS: child admin pages must remain renderable while routing is diagnosed.
  return children;
}
