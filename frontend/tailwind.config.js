export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { board: '#1F3B33', chalk: '#F3EFE4', ink: '#22302B', gold: '#E0A526', paper: '#FBFAF6' },
      fontFamily: { display: ['"Bricolage Grotesque"', 'sans-serif'], body: ['"Public Sans"', 'sans-serif'] },
    },
  },
  plugins: [],
};
