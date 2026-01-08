/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Isso cria uma pasta 'out' com o site estático
  images: {
    unoptimized: true, // Necessário para o GitHub Pages
  },
  // Se o seu repositório não for na raiz (ex: usuario.github.io/nexuspdf-pro),
  // você pode precisar adicionar o basePath. Por enquanto, tente sem.
};

export default nextConfig;