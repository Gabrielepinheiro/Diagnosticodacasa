# Como colocar o Diagnóstico da Casa no ar

O caminho do cliente:

1. Vê o seu conteúdo e envia **DIAGNÓSTICO** no direct do Instagram.
2. Recebe a senha e o link (automático ou enviado por você).
3. Abre o aplicativo no celular, digita a senha e responde em cerca de 6 minutos.
4. Vê na tela o estado geral da casa, os ambientes em ordem e o próximo passo.
5. Você recebe tudo no **painel** (`/admin.html`): respostas, pontos, quadrantes e o caminho indicado (Premier, Essence, Maison…).

Leva uns 20 minutos, uma vez só. As contas são gratuitas e é o mesmo Supabase e Render do app da família.

---

## 1. Testar antes (opcional)

Sem configurar nada, o app já roda em **modo de teste**: a senha `DEMO` funciona e as respostas ficam só no navegador. No painel, entre com qualquer e-mail.

## 2. Supabase (onde ficam as senhas e as respostas)

1. Em https://supabase.com, clique em **New project**:
   - Name: `diagnostico`
   - Region: **Central EU (Frankfurt)**, para os dados ficarem na Alemanha (DSGVO).
2. Abra **SQL Editor → New query**, cole **todo** o arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Ainda no SQL Editor, cadastre o seu e-mail como equipe (troque pelo seu):
   ```sql
   insert into public.equipe (email) values ('gabriele@gabrielepinheiro.com');
   ```
4. Em **Authentication → Users → Add user → Create new user**, crie o seu login com o **mesmo e-mail** e uma senha. Marque **Auto Confirm User**.
5. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém cria conta sozinho.
6. Em **Project Settings → API** (ou **Connect**), copie:
   - **Project URL**, algo como `https://abcd1234.supabase.co`
   - a chave **anon public** (ou **publishable key**).

   Essa chave pode ficar no site: quem faz o diagnóstico não lê nenhuma tabela, só confere a senha e envia as respostas. Nunca use a chave **service_role** (ou **secret**).
7. Abra [`js/config.js`](js/config.js) e preencha:
   ```js
   supabaseUrl: 'https://abcd1234.supabase.co',
   supabaseKey: 'a chave anon',
   instagram: 'seu.perfil',      // sem o @
   ```
   Faça o commit da alteração.

Para dar acesso a uma assistente depois: repita os passos 3 e 4 com o e-mail dela.

## 3. Render (onde o site fica)

1. Em https://render.com, clique em **New → Static Site** e escolha o repositório `Diagnosticodacasa`.
2. Preencha:
   - Name: `diagnostico` (vira `https://diagnostico.onrender.com`)
   - Branch: a branch principal
   - Build Command: deixe vazio
   - Publish Directory: `.`
3. **Create Static Site**.
4. Opcional: em **Settings → Custom Domains**, adicione `diagnostico.gabrielepinheiro.com` e crie no Wix o registro CNAME que o Render mostrar.

Endereços:
- Cliente: `https://diagnostico.onrender.com`
- Painel: `https://diagnostico.onrender.com/admin.html` (guarde nos favoritos do celular)

## 4. O direct do Instagram

O painel tem dois tipos de senha. Use um, ou os dois.

### Senha da campanha: resposta automática

Uma palavra que todos recebem (ex.: `CASA`). Ideal para a resposta automática, porque não precisa de você.

1. No painel, aba **Senhas → Senha da campanha**, crie `CASA` (pode pôr data de validade e trocar a cada mês ou campanha).
2. No **Meta Business Suite** (business.facebook.com), abra **Caixa de entrada → Automações → Respostas automáticas por palavra-chave** (o nome pode variar um pouco) e crie uma para o Instagram:
   - Palavras-chave: `DIAGNÓSTICO`, `DIAGNOSTICO`, `diagnóstico`
   - Resposta: o texto abaixo.

```
Oi! Que bom que você quer olhar para a sua casa com calma.

A sua senha para o Diagnóstico da Casa é: CASA

É só abrir https://diagnostico.onrender.com e digitar a senha. Leva cerca de 6 minutos e, no fim, você recebe os seus ambientes em ordem de prioridade e por onde começar.

Qualquer dúvida, é só me chamar aqui.
Gabriele
```

Alternativa: o **ManyChat** (plano grátis) faz o mesmo e também responde quem **comenta** uma palavra num post ou Reels ("Comente CASA e eu te envio a senha"), o que ajuda o alcance.

### Senha individual: você responde à mão

Vale uma vez e já sai com o nome da pessoa. Use quando quiser um atendimento mais pessoal.

1. No painel, aba **Senhas → Senha individual**, digite o nome e o @ e clique em **Gerar senha**.
2. Clique em **Copiar mensagem para o direct** e cole na conversa. O link já vai com a senha preenchida.

Dica: no Instagram, em **Configurações → Ferramentas para criadores → Respostas salvas**, crie um atalho (ex.: `/diag`) com o começo da mensagem.

### Onde divulgar

- Bio: *Diagnóstico da Casa gratuito: envie DIAGNÓSTICO no direct*
- Stories fixados (destaque) e o fim dos Reels: *Quer saber por qual ambiente começar? Me manda DIAGNÓSTICO no direct.*

## 5. No dia a dia

1. Abra o painel. A aba **Diagnósticos** mostra os novos primeiro.
2. Abra o diagnóstico: estado da casa, ambientes em ordem com os pontos de cada um, o caminho indicado e uma **nota interna** (ex.: "se houver vontade de mudar paredes: Personalité").
3. **Enviar por e-mail** abre o seu e-mail com o resultado completo já escrito. Revise e envie (em até 2 dias úteis, como diz o resultado). O status passa para *Respondido*.
4. **Copiar para o Notion** copia um resumo em tabela para colar na Página do Cliente.

## Ajustes depois de alguns clientes

- Pesos dos pontos, limite de impacto alto (6) e textos de direção: [`js/diagnostico.js`](js/diagnostico.js).
- Perguntas e opções: [`js/perguntas.js`](js/perguntas.js).
- Depois de mudar, rode `npm test` para conferir a matriz.
