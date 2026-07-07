import './globals.css';

export const metadata = {
  title: 'Script Image Generator',
  description: 'Turn a timestamped YouTube script into MS-Paint-style illustrations.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen">{children}</body>
    </html>
  );
}
