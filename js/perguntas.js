// As perguntas do Diagnóstico da Casa, como estão no documento do escritório.
// `amb` diz qual ambiente recebe os pontos: um id, uma lista (a pessoa escolhe entre eles)
// ou null (a pessoa escolhe qualquer ambiente).

export const AMBIENTES = [
  { id: 'hall', art: 'o', nome: 'Hall de entrada' },
  { id: 'estar', art: 'a', nome: 'Sala de estar' },
  { id: 'jantar', art: 'a', nome: 'Sala de jantar', obs: 'ou estar e jantar integradas' },
  { id: 'cozinha', art: 'a', nome: 'Cozinha' },
  { id: 'casal', art: 'o', nome: 'Quarto de casal' },
  { id: 'infantil', art: 'o', nome: 'Quarto infantil' },
  { id: 'office', art: 'o', nome: 'Home office' },
  { id: 'banheiro', art: 'o', nome: 'Banheiro' },
  { id: 'lavanderia', art: 'a', nome: 'Lavanderia' },
  { id: 'servico', art: 'a', nome: 'Área de serviço' },
  { id: 'keller', art: 'o', nome: 'Keller', obs: 'porão ou depósito' },
  { id: 'varanda', art: 'a', nome: 'Varanda ou terraço' },
];

export const artigoAmbiente = (id) => AMBIENTES.find((a) => a.id === id)?.art ?? 'o';

export const nomeAmbiente = (id) => AMBIENTES.find((a) => a.id === id)?.nome ?? id;

export const MORADORES = [
  { id: 'sozinho', t: 'Moro sozinho(a)' },
  { id: 'parceiro', t: 'Com parceiro(a)' },
  { id: 'criancas', t: 'Com crianças' },
  { id: 'animais', t: 'Com animais' },
];

export const PAZ = [
  { v: 0, t: 'Nada, gosto dele como está' },
  { v: 1, t: 'Um pouco' },
  { v: 2, t: 'Bastante' },
  { v: 3, t: 'Muito, é o que mais me incomoda' },
];

export const FREQ = [
  { v: 3, t: 'Todos os dias' },
  { v: 2, t: 'Algumas vezes por semana' },
  { v: 1, t: 'Raramente' },
];

export const ESTADO = [
  { id: 'gosto', t: 'Gosto de como ele está', leve: true },
  { id: 'moveis', t: 'Tem os móveis, falta deixar com a nossa cara', leve: true },
  { id: 'provisorio', t: 'Tem móveis provisórios ou que não combinam', leve: false },
  { id: 'vazio', t: 'Está vazio ou quase vazio', leve: false },
  { id: 'nao_funciona', t: 'Está completo, mas não funciona para a nossa rotina', leve: false },
];

export const ATRITOS = [
  { id: 'guarda_roupa', t: 'O guarda-roupa não tem mais espaço', amb: 'casal' },
  { id: 'chegada', t: 'Não tenho onde deixar casacos, sapatos, chaves e bolsas ao chegar', amb: 'hall' },
  { id: 'trabalho', t: 'Trabalho na mesa de jantar, no sofá ou na cama', amb: 'office' },
  { id: 'roupa', t: 'A roupa secando fica espalhada pela casa', amb: ['lavanderia', 'servico'] },
  { id: 'brinquedos', t: 'Os brinquedos se espalham pela casa inteira', amb: 'infantil' },
  { id: 'receber', t: 'Não consigo receber pessoas à mesa com conforto', amb: 'jantar' },
  { id: 'descansar_juntos', t: 'Não temos um lugar gostoso para descansar juntos', amb: 'estar' },
  { id: 'cozinha', t: 'A cozinha não tem bancada ou armário suficiente', amb: 'cozinha' },
  { id: 'luz', t: 'Falta luz boa à noite, a casa fica escura e fria', amb: null },
  { id: 'quarto', t: 'O quarto não me deixa descansar de verdade', amb: 'casal' },
  { id: 'banheiro', t: 'Falta lugar para guardar no banheiro', amb: 'banheiro' },
  { id: 'outra', t: 'Outra', amb: null, outra: true },
];

export const FALTAS = [
  { id: 'trabalhar', t: 'Um lugar para trabalhar ou estudar', amb: 'office' },
  { id: 'receber', t: 'Um lugar para receber família e amigos', amb: 'jantar' },
  { id: 'guardar', t: 'Um lugar para guardar malas, bicicleta, coisas de estação', amb: ['hall', 'lavanderia', 'servico', 'keller'] },
  { id: 'cantinho', t: 'Um cantinho só meu, para ler ou descansar', amb: 'estar' },
  { id: 'brincar', t: 'Um lugar para as crianças brincarem', amb: 'infantil' },
  { id: 'hospedar', t: 'Um lugar para hospedar quem vem do Brasil', amb: null },
  { id: 'nada', t: 'Nada me falta, o problema é como as coisas estão', nenhum: true },
  { id: 'outra', t: 'Outra', amb: null, outra: true },
];

export const TEMPO = [
  { id: 'menos2', t: 'Menos de 2 anos' },
  { id: '2a5', t: 'De 2 a 5 anos' },
  { id: 'mais5', t: 'Mais de 5 anos, ou é o nosso lar' },
  { id: 'indeterminado', t: 'Tempo indeterminado' },
];

export const ORIGEM = [
  { id: 'instagram', t: 'Instagram' },
  { id: 'indicacao', t: 'Indicação' },
  { id: 'google', t: 'Google' },
  { id: 'outro', t: 'Outro' },
];

// Os planos para a casa: ajudam a indicar a linha de serviço e a prioridade no painel.
export const IMOVEL = [
  { id: 'proprio', t: 'Próprio' },
  { id: 'alugado', t: 'Alugado' },
];

export const PINTURA = [
  { id: 'sim', t: 'Sim, gostaria de mudar as paredes' },
  { id: 'talvez', t: 'Talvez, se fizer sentido no projeto' },
  { id: 'nao', t: 'Não, quero manter as paredes como estão' },
];

export const INICIO = [
  { id: 'mes', t: 'Ainda este mês' },
  { id: 'tres_meses', t: 'Nos próximos 3 meses' },
  { id: 'pesquisando', t: 'Ainda estou pesquisando' },
];

// Você e a decoração: para o escritório conhecer o público.
export const ACOMPANHA = [
  { id: 'diario', t: 'Todos os dias, adoro' },
  { id: 'semana', t: 'Algumas vezes por semana' },
  { id: 'as_vezes', t: 'De vez em quando' },
  { id: 'quase_nunca', t: 'Quase nunca' },
];

export const REFERENCIAS = [
  { id: 'pinterest', t: 'Salvo no Pinterest' },
  { id: 'instagram', t: 'Salvo nos favoritos do Instagram' },
  { id: 'prints', t: 'Tiro prints e guardo no celular' },
  { id: 'lojas', t: 'Guardo links de lojas e produtos' },
  { id: 'nao', t: 'Não costumo salvar', nenhum: true },
];

export const TRAVAS = [
  { id: 'gosto_pratica', t: 'Sinto que tenho bom gosto, mas não sei colocar em prática' },
  { id: 'medo_errar', t: 'Tenho medo de gastar e me arrepender' },
  { id: 'combinar', t: 'Não sei se as coisas vão combinar entre si' },
  { id: 'medidas', t: 'Não sei as medidas certas (tamanho do sofá, do tapete, altura dos quadros)' },
  { id: 'decidir', t: 'Tenho muitas referências e não consigo decidir' },
  { id: 'tempo', t: 'Falta tempo para pesquisar e comprar' },
  { id: 'encontrar', t: 'Não encontro onde moro as coisas no estilo que eu gosto' },
  { id: 'opinioes', t: 'Cada pessoa da casa quer uma coisa' },
  { id: 'comecar', t: 'Não sei por onde começar' },
];

export const MAX_ESCOLHAS = 3;
