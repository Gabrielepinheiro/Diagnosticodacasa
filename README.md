# Diagnóstico da Casa · GP.

Aplicativo do escritório Gabriele Pinheiro · Design de interiores online.

A pessoa pede a senha no direct do Instagram, responde o diagnóstico no celular (cerca de 6 minutos) e recebe os ambientes da casa em ordem de prioridade, com uma direção de por onde começar. O escritório recebe as respostas num painel e indica o caminho: Premier, Essence, Maison ou Personalité.

**Para colocar no ar: [GUIA.md](GUIA.md).**

## Telas

- `index.html`: o aplicativo do cliente. Senha → abertura → 8 blocos de perguntas (uma tela por ambiente) → resultado com a saúde da casa. O rascunho fica salvo no celular, caso a pessoa feche a página no meio.
- `admin.html`: o painel do escritório. Gera senhas e mostra os diagnósticos recebidos, com os pontos de cada ambiente, o caminho indicado e botões para enviar por e-mail e copiar para o Notion. A aba Público soma as respostas de todos os clientes (travas, referências, o que querem ver no Instagram…).

## Senhas

- **Campanha**: uma palavra para muitas pessoas (ex.: `CASA`), para a resposta automática do Instagram. Pode ter validade e limite de usos.
- **Individual**: um código de 6 letras que vale uma vez, gerado no painel para quem você atende à mão.

Maiúsculas, espaços e acentos não importam (`diagnóstico` = `DIAGNOSTICO`).

## Arquivos

- `js/perguntas.js`: as perguntas e opções
- `js/diagnostico.js`: a matriz de prioridade (pontos, quadrantes, estado geral, caminho)
- `js/app.js`: telas do cliente
- `js/admin.js`: painel
- `js/api.js`: Supabase (ou o navegador, no modo de teste)
- `js/config.js`: endereço do Supabase e @ do Instagram
- `supabase/schema.sql`: tabelas e regras de segurança
- `tests/`: testes da matriz (`npm test`)

Sem build: são arquivos estáticos. Para abrir no computador: `npm run dev` e acesse http://localhost:8080.
