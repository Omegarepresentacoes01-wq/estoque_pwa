import jsPDF from "jspdf";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const PRIMARY : [number,number,number] = [0,   82,  165];
const DARK    : [number,number,number] = [15,  23,  42 ];
const GRAY    : [number,number,number] = [100, 116, 139];
const LIGHT   : [number,number,number] = [241, 245, 249];
const WHITE   : [number,number,number] = [255, 255, 255];
const RED     : [number,number,number] = [220, 38,  38 ];
const GREEN   : [number,number,number] = [22,  163, 74 ];
const AMBER   : [number,number,number] = [217, 119, 6  ];

// ─── Formatadores ─────────────────────────────────────────────────────────────
const fmt = (v: unknown): string =>
  v == null || v === "" ? "—" : String(v);

const fmtDate = (v: unknown): string => {
  if (!v) return "—";
  try { return new Date(v as string).toLocaleDateString("pt-BR"); } catch { return String(v); }
};

const fmtDatetime = (v: unknown): string => {
  if (!v) return "—";
  try { return new Date(v as string).toLocaleString("pt-BR"); } catch { return String(v); }
};

const tipoLabel = (tipo: string, campo?: string | null): string => {
  const map: Record<string, string> = {
    status_change: "Status alterado",
    cliente_change: "Cliente alterado",
    localizacao_change: "Localização alterada",
    criado: "Veículo cadastrado",
  };
  if (tipo === "campo_change" && campo) {
    const campos: Record<string, string> = {
      observacao: "Observação atualizada", implemento: "Implemento atualizado",
      pneu: "Pneu atualizado", defletor: "Defletor atualizado",
      diasEstoque: "Dias de estoque atualizados", diasPatio: "Dias de pátio atualizados",
      cor: "Cor atualizada", anoMod: "Ano/Mod atualizado",
      dataChegadaCovezi: "Data de chegada atualizada", dataAtual: "Data atual atualizada",
    };
    return campos[campo] ?? `Campo "${campo}" alterado`;
  }
  return map[tipo] ?? "Registro editado";
};

// ─── Carrega imagem como base64 via canvas ────────────────────────────────────
function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── Gerador principal ────────────────────────────────────────────────────────
export async function gerarPDFVeiculo(veiculo: any, historico: any[]): Promise<void> {
  const doc  = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Dimensões em pontos (A4 = 595 × 842 pt)
  const PW   = 595;
  const PH   = 842;
  const ML   = 40;   // margem esquerda
  const MR   = 40;   // margem direita
  const CW   = PW - ML - MR; // largura do conteúdo = 515 pt
  const FOOT = 30;   // altura do rodapé

  // Tipografia: tamanhos em pt, line-height = fontSize * 1.4
  const FS_LABEL  = 7.5;
  const FS_VALUE  = 9.5;
  const FS_SMALL  = 8;
  const LH_VALUE  = FS_VALUE  * 1.45;
  const LH_SMALL  = FS_SMALL  * 1.45;
  const LH_LABEL  = FS_LABEL  * 1.45;

  let y = 0; // posição vertical corrente (baseline da próxima linha)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const sf = (c: [number,number,number]) => doc.setFillColor(c[0], c[1], c[2]);
  const sd = (c: [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const st = (c: [number,number,number]) => doc.setTextColor(c[0], c[1], c[2]);

  /** Garante que há espaço suficiente; se não, adiciona página. */
  function ensureSpace(needed: number) {
    if (y + needed > PH - FOOT - 10) {
      doc.addPage();
      y = ML;
    }
  }

  /**
   * Escreve um bloco label + valor e retorna a altura total consumida.
   * x      = posição X absoluta
   * maxW   = largura máxima disponível para o texto
   */
  function writeField(
    label: string,
    value: string,
    x: number,
    maxW: number,
  ): number {
    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS_LABEL);
    st(GRAY);
    doc.text(label.toUpperCase(), x, y);

    // Valor (pode ter múltiplas linhas)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS_VALUE);
    st(DARK);
    const lines: string[] = doc.splitTextToSize(value, maxW);
    const valueY = y + LH_LABEL + 2; // espaço entre label e valor
    doc.text(lines, x, valueY);

    // Altura total = label + espaço + linhas de valor
    return LH_LABEL + 2 + lines.length * LH_VALUE + 4;
  }

  /**
   * Renderiza pares de campos em duas colunas.
   * Cada par ocupa a mesma altura (máximo das duas colunas).
   */
  function twoColSection(rows: { label: string; value: string }[]) {
    const colW = (CW - 20) / 2; // 20 pt de gap entre colunas

    for (let i = 0; i < rows.length; i += 2) {
      const left  = rows[i];
      const right = rows[i + 1];

      // Calcula alturas sem desenhar para reservar espaço
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_VALUE);
      const linesL = doc.splitTextToSize(left.value, colW);
      const linesR = right ? doc.splitTextToSize(right.value, colW) : [];
      const rowH   = LH_LABEL + 2 + Math.max(linesL.length, linesR.length || 1) * LH_VALUE + 12;

      ensureSpace(rowH);

      // Desenha coluna esquerda
      writeField(left.label, left.value, ML, colW);

      // Desenha coluna direita (se existir e não for vazia)
      if (right && right.label) {
        writeField(right.label, right.value, ML + colW + 20, colW);
      }

      y += rowH;

      // Linha divisória
      sd([226, 232, 240]);
      doc.setLineWidth(0.5);
      doc.line(ML, y - 6, ML + CW, y - 6);
    }
  }

  /** Título de secção com fundo claro */
  function sectionTitle(title: string) {
    ensureSpace(28);
    const boxH = 20;
    sf(LIGHT);
    sd(PRIMARY);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, y, CW, boxH, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    st(PRIMARY);
    // Centraliza verticalmente: baseline = y + boxH/2 + fontSize*0.35
    doc.text(title.toUpperCase(), ML + 10, y + boxH / 2 + 9 * 0.35 + 1);
    y += boxH + 10;
  }

  // ── Cabeçalho ────────────────────────────────────────────────────────────────

  const HEADER_H = 80;
  sf(PRIMARY);
  doc.rect(0, 0, PW, HEADER_H, "F");

  const logoB64 = await loadImageAsBase64(
    "https://static.manus.space/files/covezi-logo-main.png",
  );
  if (logoB64) {
    // Logo: altura 36 pt, largura proporcional (aprox 2.8:1)
    doc.addImage(logoB64, "PNG", ML, 22, 100, 36);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    st(WHITE);
    doc.text("COVEZI IVECO", ML, 48);
  }

  // Título à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  st(WHITE);
  doc.text("FICHA DO VEÍCULO", PW - MR, 38, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_SMALL);
  st([186, 214, 255] as [number,number,number]);
  doc.text(`Gerado em ${fmtDatetime(new Date())}`, PW - MR, 38 + LH_SMALL, { align: "right" });

  y = HEADER_H + 20;

  // ── Identificação do veículo ──────────────────────────────────────────────

  // Modelo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  st(DARK);
  const modeloLines: string[] = doc.splitTextToSize(fmt(veiculo.modelo), CW);
  doc.text(modeloLines, ML, y);
  y += modeloLines.length * 18 * 1.3 + 6;

  // Badges de status
  const status      = (veiculo.status ?? "").toUpperCase();
  const statusColor = status === "LIVRE" ? GREEN : status === "RESERVADO" ? AMBER : GRAY;
  const BADGE_H     = 16;
  const BADGE_PAD   = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const statusW = doc.getTextWidth(status) + BADGE_PAD * 2;
  sf(statusColor);
  doc.roundedRect(ML, y, statusW, BADGE_H, 3, 3, "F");
  st(WHITE);
  doc.text(status, ML + statusW / 2, y + BADGE_H / 2 + 8 * 0.35, { align: "center" });

  let badgeX = ML + statusW + 8;
  if (Math.abs(veiculo.diasEstoque ?? 0) > 180) {
    const critW = doc.getTextWidth("CRÍTICO") + BADGE_PAD * 2;
    sf(RED);
    doc.roundedRect(badgeX, y, critW, BADGE_H, 3, 3, "F");
    st(WHITE);
    doc.text("CRÍTICO", badgeX + critW / 2, y + BADGE_H / 2 + 8 * 0.35, { align: "center" });
    badgeX += critW + 8;
  }

  y += BADGE_H + 10;

  // Chassi / NF
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_SMALL);
  st(GRAY);
  const chassiLine = `Chassi: ${fmt(veiculo.chassi)}${veiculo.nf ? `   ·   NF: ${veiculo.nf}` : ""}`;
  doc.text(chassiLine, ML, y);
  y += LH_SMALL + 8;

  // Separador
  sd([203, 213, 225]);
  doc.setLineWidth(0.75);
  doc.line(ML, y, ML + CW, y);
  y += 16;

  // ── Secções de dados ──────────────────────────────────────────────────────

  sectionTitle("Identificação");
  twoColSection([
    { label: "NF",           value: fmt(veiculo.nf) },
    { label: "Código",       value: fmt(veiculo.cod) },
    { label: "Modelo",       value: fmt(veiculo.modelo) },
    { label: "Ano / Modelo", value: fmt(veiculo.anoMod) },
    { label: "Cor",          value: fmt(veiculo.cor) },
    { label: "Chassi",       value: fmt(veiculo.chassi) },
    { label: "Data Emissão", value: fmtDate(veiculo.dataEmissao) },
    { label: "",             value: "" },
  ]);

  sectionTitle("Localização e Datas");
  twoColSection([
    { label: "Estoque Físico",  value: fmt(veiculo.estoquesFisico) },
    { label: "Chegada COVEZI", value: fmtDate(veiculo.dataChegadaCovezi) },
    { label: "Data Atual",      value: fmtDate(veiculo.dataAtual) },
    { label: "Dias em Estoque", value: `${Math.abs(veiculo.diasEstoque ?? 0)} dias` },
    { label: "Dias de Pátio",   value: `${Math.abs(veiculo.diasPatio ?? 0)} dias` },
    { label: "",                value: "" },
  ]);

  sectionTitle("Status e Comercial");
  twoColSection([
    { label: "Status",     value: fmt(veiculo.status) },
    { label: "Cliente",    value: fmt(veiculo.cliente) },
    { label: "Observação", value: fmt(veiculo.observacao) },
    { label: "",           value: "" },
  ]);

  sectionTitle("Equipamentos");
  twoColSection([
    { label: "Implemento", value: fmt(veiculo.implemento) },
    { label: "Pneu",       value: fmt(veiculo.pneu) },
    { label: "Defletor",   value: fmt(veiculo.defletor) },
    { label: "",           value: "" },
  ]);

  // ── Histórico ─────────────────────────────────────────────────────────────

  if (historico.length > 0) {
    sectionTitle(`Histórico de Alterações (${historico.length} registros)`);

    historico.forEach((entry, idx) => {
      // Estima altura necessária para este evento
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_VALUE);
      const changeLines = (entry.valorAnterior || entry.valorNovo)
        ? doc.splitTextToSize(
            [
              entry.valorAnterior ? `De: "${entry.valorAnterior}"` : "",
              entry.valorNovo     ? `Para: "${entry.valorNovo}"`   : "",
            ].filter(Boolean).join("   →   "),
            CW - 60,
          )
        : [];
      const obsLines = entry.observacao
        ? doc.splitTextToSize(entry.observacao, CW - 60)
        : [];

      const eventH =
        LH_VALUE + 4 +                        // tipo
        (entry.usuarioNome ? LH_SMALL + 2 : 0) +
        (changeLines.length > 0 ? changeLines.length * LH_SMALL + 16 : 0) +
        (obsLines.length    > 0 ? obsLines.length    * LH_SMALL + 6  : 0) +
        12;

      ensureSpace(eventH);

      const rowStartY = y;

      // Círculo numerado
      const CX = ML + 10;
      const CY = rowStartY + 10;
      sf(PRIMARY);
      doc.circle(CX, CY, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      st(WHITE);
      doc.text(String(historico.length - idx), CX, CY + 7.5 * 0.35, { align: "center" });

      const TX = ML + 26; // X do texto após o círculo

      // Tipo do evento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FS_VALUE);
      st(DARK);
      doc.text(tipoLabel(entry.tipo, entry.campo), TX, rowStartY + LH_VALUE);

      // Data (alinhada à direita)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_SMALL);
      st(GRAY);
      doc.text(fmtDatetime(entry.createdAt), PW - MR, rowStartY + LH_VALUE, { align: "right" });

      y = rowStartY + LH_VALUE + 4;

      // Usuário
      if (entry.usuarioNome) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(FS_SMALL);
        st(GRAY);
        doc.text(`por ${entry.usuarioNome}`, TX, y + LH_SMALL);
        y += LH_SMALL + 4;
      }

      // Caixa de mudança de valor
      if (changeLines.length > 0) {
        const boxPadV = 6;
        const boxPadH = 8;
        const boxH    = changeLines.length * LH_SMALL + boxPadV * 2;
        sf(LIGHT);
        sd([203, 213, 225]);
        doc.setLineWidth(0.5);
        doc.roundedRect(TX, y, CW - TX + ML, boxH, 3, 3, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_SMALL);
        st(DARK);
        doc.text(changeLines, TX + boxPadH, y + boxPadV + LH_SMALL * 0.85);
        y += boxH + 6;
      }

      // Observação
      if (obsLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(FS_SMALL);
        st(GRAY);
        doc.text(obsLines, TX, y + LH_SMALL);
        y += obsLines.length * LH_SMALL + 6;
      }

      y += 10;

      // Divisória entre eventos
      if (idx < historico.length - 1) {
        sd([226, 232, 240]);
        doc.setLineWidth(0.5);
        doc.line(TX, y - 4, ML + CW, y - 4);
      }
    });
  }

  // ── Rodapé em todas as páginas ────────────────────────────────────────────

  const totalPages: number = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    sf(LIGHT);
    doc.rect(0, PH - FOOT, PW, FOOT, "F");
    sd([203, 213, 225]);
    doc.setLineWidth(0.5);
    doc.line(0, PH - FOOT, PW, PH - FOOT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    st(GRAY);
    doc.text(
      "Covezi Iveco · Sistema de Gestão de Estoque",
      ML,
      PH - FOOT / 2 + 7.5 * 0.35,
    );
    doc.text(
      `Página ${p} de ${totalPages}`,
      PW - MR,
      PH - FOOT / 2 + 7.5 * 0.35,
      { align: "right" },
    );
  }

  // ── Download ──────────────────────────────────────────────────────────────

  const fileName = `veiculo-${
    (veiculo.chassi ?? veiculo.id ?? "sem-chassi")
      .toString()
      .replace(/\s+/g, "-")
  }.pdf`;
  doc.save(fileName);
}
