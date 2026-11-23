# WattWise — Manual de Identidade Visual & Brand Guidelines
**Posicionamento:** Smart Energy Intelligence  
**Conceito Central:** PRECISION ECO-TECH  
**Versão:** 2.0.0 (Produção / Evento Acadêmico)

---

## 1. Posicionamento e Conceito da Marca

O **WattWise** nasceu para transformar dados brutos de consumo energético em inteligência operacional palpável. Nosso conceito visual — **PRECISION ECO-TECH** — reflete três pilares indissociáveis:

1. **Rigor Algorítmico e Telemetria:** Linhas arquiteturais, numerais tabulares em monospace e gráficos analíticos limpos.
2. **Sustentabilidade Consciente:** Conexão com o impacto ambiental real ($\text{kg CO}_2\text{e}$ da matriz elétrica brasileira).
3. **Padrão SaaS Profissional:** Tipografia moderna, contraste balanceado para temas escuro e claro, e interfaces responsivas sem poluição visual.

> [!IMPORTANT]
> **O que o WattWise NÃO é:**  
> Evitamos intencionalmente clipart de raios genéricos, folhas verdes infantis ou visual de "template genérico de IA". A marca transmite sofisticação técnica, confiabilidade analítica e responsabilidade ecológica.

---

## 2. Símbolo e Geometria da Marca

O símbolo do WattWise é uma estrutura geométrica vetorial em formato de **"W"**, formada pela fusão de facetas angulares que representam a continuidade do fluxo energético e a precisão do monitoramento computacional.

- **Vetor de Fluxo Energético:** Traço descendente e ascendente com inclinação balanceada e chanfros dinâmicos.
- **Nodo de Telemetria (Signal Node):** Ponto superior em **Lime Signal** (`#C8F36B`) representando a detecção ativa de dados em tempo real.
- **Gradiente Dinâmico:** Transição suave entre **Energy Green** (`#24B47E`), **Mint** (`#34D399`) e **Electric Mint** (`#69E6AE`).

```
         (•) Lime Signal Node (x=41.5, y=7.5)
   \    /\    /
    \  /  \  /   <-- Geometric Eco-Tech W
     \/    \/
```

---

## 3. Paleta Cromática e Tokens CSS

A paleta foi desenhada para oferecer legibilidade exemplar tanto no **Tema Escuro (Primário / Padrão)** quanto no **Tema Claro (Experiência Cuidadosa)**.

### 3.1 Cores Primitivas

| Nome | Hex | Função Semântica |
| :--- | :--- | :--- |
| **Deep Forest** | `#0B1714` | Canvas principal no tema escuro, contraste de texto no tema claro. |
| **Forest Green** | `#12382D` | Superfícies, cabeçalhos de tabela e painéis estruturais escuros. |
| **Energy Green** | `#24B47E` | Cor de destaque primária, botões de ação principal, status ativo. |
| **Electric Mint** | `#69E6AE` | Destaque secundário, curvas de gráfico, nós e estados de hover. |
| **Lime Signal** | `#C8F36B` | Badges de telemetria, indicadores de pico e código OTP. |
| **Carbon** | `#18221F` | Superfícies elevadas, inputs, cards secundários. |
| **Slate** | `#82918A` | Bordas estruturais, textos secundários e metadados. |
| **Cloud** | `#F2F6F2` | Textos primários no tema escuro, canvas no tema claro. |
| **Pure White** | `#FFFFFF` | Destaques de alto contraste e superfícies no tema claro. |

### 3.2 Tokens Semânticos por Tema

```css
/* Dark Theme (Padrão) */
--bg-canvas: #0B1714;
--bg-surface: #102620;
--bg-surface-elevated: #16332B;
--bg-input: #0D1F1A;
--text-primary: #F2F6F2;
--text-secondary: #9EB0A7;
--border-default: rgba(130, 145, 138, 0.24);
--emerald-500: #24B47E;

/* Light Theme (Ativado via [data-theme="light"]) */
--bg-canvas: #F4F8F5;
--bg-surface: #FFFFFF;
--bg-surface-elevated: #F9FCFA;
--bg-input: #EBF3EE;
--text-primary: #0B1714;
--text-secondary: #2C4239;
--border-default: rgba(18, 56, 45, 0.16);
--emerald-500: #158C5E; /* Contraste ajustado para WCAG AAA */
```

---

## 4. Tipografia Oficial

Combinamos duas famílias tipográficas carregadas via Google Fonts:

1. **Interface, Títulos e Textos Correntes:** `Manrope` (pesos 400, 500, 600, 700, 800)
   - Excelente legibilidade em telas de alta densidade e proporções modernas de x-height.
2. **Telemetria, Numerais, Moeda e Código OTP:** `IBM Plex Mono` (pesos 400, 500, 600, 700)
   - Numerais tabulares estritamente alinhados para séries temporais, leituras em kWh, custos em reais e o código OTP de 6 dígitos.

---

## 5. Arquitetura de Assets SVG em `public/brand/`

Todos os arquivos vetoriais foram criados com resolução independente e suporte a renderização responsiva:

- `public/brand/wattwise-logo.svg`: Logotipo horizontal canônico (Símbolo + "WattWise" + Subtítulo "SMART ENERGY INTELLIGENCE").
- `public/brand/wattwise-logo-dark.svg`: Versão otimizada para fundos escuros (grafite/deep forest).
- `public/brand/wattwise-logo-light.svg`: Versão de alto contraste para fundos claros.
- `public/brand/wattwise-symbol.svg`: Símbolo "W" isolado.
- `public/brand/wattwise-symbol-dark.svg`: Símbolo com filtro de brilho energético sutil.
- `public/brand/wattwise-symbol-light.svg`: Símbolo de alto contraste em verde floresta.
- `public/brand/wattwise-app-icon.svg`: Ícone de aplicativo em squircle escuro com bordas de telemetria.
- `public/brand/og-image.svg`: Card Open Graph 1200x630 para compartilhamento em redes sociais.
- `public/favicon.svg`: Favicon SVG responsivo para navegadores modernos.

---

## 6. Regras de Aplicação (Do's & Don'ts)

### O que fazer (Do's)
- Utilize sempre os arquivos SVG oficiais de `public/brand/`.
- Mantenha a proporção e a margem de respiro mínima ao redor do símbolo (equivalente a 50% da altura do símbolo).
- Utilize a classe `.tabular-nums` ou `font-family: var(--font-mono)` para todas as medições numéricas, kWh e valores em R$.
- Respeite o seletor `data-theme="light"` para alternar automaticamente a versão do logotipo e dos contrastes.

### O que NÃO fazer (Don'ts)
- Não distorça horizontal ou verticalmente o logotipo ou o símbolo.
- Não substitua o logotipo por emojis de raio (`⚡`) ou lâmpadas.
- Não utilize sombras pesadas ou cores fora da paleta (evitar tons fluorescentes ou roxos não mapeados).
- Não coloque o logotipo escuro sobre fundos escuros sem contraste adequado.
