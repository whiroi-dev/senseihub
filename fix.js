const fs = require('fs');
const file = 'frontend/src/pages/GeneratorPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `const rankDetails: Record<RankKey, { color: string; phrase: string }> = {
  "Faixa Branca (7º Kyu)": { color: "#374151", phrase: "A pureza do início. A mente está vazia, pronta para aprender, e um novo caminho se abre à sua frente." },
  "Faixa Amarela (6º Kyu)": { color: "#FFD700", phrase: "A terra que firma suas raízes. Sua base se fortalece e a luz do conhecimento começa a brilhar." },
  "Faixa Laranja (5º Kyu)": { color: "#FFA500", phrase: "A energia do sol nascente. Sua percepção do karatê se expande e a sua vontade se fortalece a cada dia." },
  "Faixa Azul (4º Kyu)": { color: "#0000FF", phrase: "A fluidez e a imensidão do céu e do mar. Sua técnica se torna mais fluida e o espírito mais sereno." },
  "Faixa Verde (3º Kyu)": { color: "#008000", phrase: "O florescer das plantas. A esperança e o crescimento são evidentes em sua técnica e espírito." },
  "Faixa Roxa (2º Kyu)": { color: "#800080", phrase: "A busca pela dignidade e o respeito. A persistência é o caminho do êxito e você superou mais uma etapa com determinação." },
  "Faixa Marrom (1º Kyu)": { color: "#A52A2A", phrase: "A solidez da árvore madura. Sua técnica está sólida e a mente madura, preparando-o para a responsabilidade da faixa preta." },
  "Faixa Preta (1º Dan)": { color: "#000000", phrase: "O fim é apenas o começo. A faixa preta não é a chegada, mas o início de uma jornada de aprimoramento contínuo." },
  "Faixa Preta (2º Dan)": { color: "#000000", phrase: "A profundidade da técnica. A experiência se consolida e a verdadeira essência da arte marcial começa a ser revelada." },
  "Faixa Preta (3º Dan)": { color: "#000000", phrase: "O domínio do espírito. A técnica flui naturalmente e o praticante se torna um guia para os mais novos." },
  "Faixa Preta (4º Dan)": { color: "#000000", phrase: "A excelência em movimento. O mestre aperfeiçoa não apenas a técnica, mas a filosofia e o caráter." },
  "Faixa Preta (5º Dan)": { color: "#000000", phrase: "A maestria plena. Uma vida dedicada à arte, onde o praticante e a arte se tornam um só." }
};`;

content = content.replace(/const rankDetails: Record<RankKey, \{ color: string; phrase: string \}> = \{[\s\S]*?\};/, replacement);

fs.writeFileSync(file, content);
console.log('Fixed!');
