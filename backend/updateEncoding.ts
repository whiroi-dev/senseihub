import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const phrases = {
  'Faixa Branca': 'A pureza do início. A mente está vazia, pronta para aprender, e um novo caminho se abre à sua frente.',
  'Faixa Amarela': 'A terra que firma suas raízes. Sua base se fortalece e a luz do conhecimento começa a brilhar.',
  'Faixa Laranja': 'A energia do sol nascente. Sua percepção do karatê se expande e a sua vontade se fortalece a cada dia.',
  'Faixa Verde': 'O florescer das plantas. A esperança e o crescimento são evidentes em sua técnica e espírito.',
  'Faixa Roxa': 'A busca pela dignidade e o respeito. A persistência é o caminho do êxito e você superou mais uma etapa com determinação.',
  'Faixa Marrom': 'A solidez da árvore madura. Sua técnica está sólida e a mente madura, preparando-o para a responsabilidade da faixa preta.',
  'Faixa Preta': 'O fim é apenas o começo. A faixa preta não é a chegada, mas o início de uma jornada de aprimoramento contínuo.'
};

async function main() {
  const ranks = await prisma.rank.findMany();
  for (const r of ranks) {
    const key = Object.keys(phrases).find(k => r.name.includes(k));
    if (key) {
      await prisma.rank.update({ where: { id: r.id }, data: { phrase: phrases[key as keyof typeof phrases] } });
    }
  }
}
main().then(()=>process.exit(0));
