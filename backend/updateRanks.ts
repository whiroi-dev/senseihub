import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rankDetails = {
  'Faixa Branca (7º Kyu)': { color: '#374151', phrase: 'A pureza do início. A mente está vazia, pronta para aprender, e um novo caminho se abre à sua frente.' },
  'Faixa Amarela (6º Kyu)': { color: '#FFD700', phrase: 'A terra que firma suas raízes. Sua base se fortalece e a luz do conhecimento começa a brilhar.' },
  'Faixa Vermelha (5º Kyu)': { color: '#FF0000', phrase: 'A chama da paixão e vitalidade. O fogo do treinamento começa a aquecer o corpo e o espírito.' },
  'Faixa Laranja (4º Kyu)': { color: '#FFA500', phrase: 'A energia do sol nascente. Sua percepção do karatê se expande e a sua vontade se fortalece a cada dia.' },
  'Faixa Verde (3º Kyu)': { color: '#008000', phrase: 'O florescer das plantas. A esperança e o crescimento são evidentes em sua técnica e espírito.' },
  'Faixa Roxa (2º Kyu)': { color: '#800080', phrase: 'A busca pela dignidade e o respeito. A persistência é o caminho do êxito e você superou mais uma etapa com determinação.' },
  'Faixa Marrom (1º Kyu)': { color: '#8B4513', phrase: 'A solidez da árvore madura. Sua técnica está sólida e a mente madura, preparando-o para a responsabilidade da faixa preta.' },
  'Faixa Preta (1º Dan)': { color: '#000000', phrase: 'O fim é apenas o começo. A faixa preta não é a chegada, mas o início de uma jornada de aprimoramento contínuo.' }
};

async function main() {
  const ranks = await prisma.rank.findMany();
  for (const rank of ranks) {
    const key = Object.keys(rankDetails).find(k => rank.name.includes(k.split(' (')[0]));
    if (key) {
      const details = rankDetails[key as keyof typeof rankDetails];
      await prisma.rank.update({
        where: { id: rank.id },
        data: {
          color: details.color,
          phrase: details.phrase
        }
      });
      console.log('Updated ' + rank.name);
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

