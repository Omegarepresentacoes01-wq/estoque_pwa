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
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // ── Dimensões A4 ──────────────────────────────────────────────────────────
  const PW   = 595;   // largura total
  const PH   = 842;   // altura total
  const ML   = 36;    // margem esquerda
  const MR   = 36;    // margem direita
  const CW   = PW - ML - MR; // 523 pt de conteúdo
  const FOOT = 22;    // altura do rodapé

  // ── Tipografia compacta ───────────────────────────────────────────────────
  const FS_LABEL = 6.5;
  const FS_VALUE = 8.5;
  const FS_SMALL = 7.5;
  const LH_LABEL = FS_LABEL * 1.3;
  const LH_VALUE = FS_VALUE * 1.3;
  const LH_SMALL = FS_SMALL * 1.3;

  let y = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sf = (c: [number,number,number]) => doc.setFillColor(c[0], c[1], c[2]);
  const sd = (c: [number,number,number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const st = (c: [number,number,number]) => doc.setTextColor(c[0], c[1], c[2]);

  function ensureSpace(needed: number) {
    if (y + needed > PH - FOOT - 8) {
      doc.addPage();
      y = ML;
    }
  }

  /** Escreve label + valor numa coluna; retorna altura consumida */
  function writeField(label: string, value: string, x: number, maxW: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS_LABEL);
    st(GRAY);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS_VALUE);
    st(DARK);
    const lines: string[] = doc.splitTextToSize(value, maxW);
    doc.text(lines, x, y + LH_LABEL + 1);
    return LH_LABEL + 1 + lines.length * LH_VALUE + 2;
  }

  /** Renderiza pares de campos em 2 colunas */
  function twoColSection(rows: { label: string; value: string }[]) {
    const GAP  = 16;
    const colW = (CW - GAP) / 2;

    for (let i = 0; i < rows.length; i += 2) {
      const left  = rows[i];
      const right = rows[i + 1];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_VALUE);
      const linesL = doc.splitTextToSize(left.value, colW);
      const linesR = right ? doc.splitTextToSize(right.value, colW) : [];
      const rowH   = LH_LABEL + 1 + Math.max(linesL.length, linesR.length || 1) * LH_VALUE + 8;

      ensureSpace(rowH);
      writeField(left.label, left.value, ML, colW);
      if (right && right.label) writeField(right.label, right.value, ML + colW + GAP, colW);

      y += rowH;

      sd([226, 232, 240]);
      doc.setLineWidth(0.4);
      doc.line(ML, y - 4, ML + CW, y - 4);
    }
  }

  /** Título de secção compacto */
  function sectionTitle(title: string) {
    ensureSpace(20);
    const boxH = 15;
    sf(LIGHT);
    sd(PRIMARY);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    st(PRIMARY);
    doc.text(title.toUpperCase(), ML + 8, y + boxH / 2 + 7.5 * 0.35 + 0.5);
    y += boxH + 6;
  }

  // ── Cabeçalho compacto (55 pt) ────────────────────────────────────────────
  const HEADER_H = 55;
  sf(PRIMARY);
  doc.rect(0, 0, PW, HEADER_H, "F");

  const logoB64 = await loadImageAsBase64(
    "https://static.manus.space/files/covezi-logo-main.png",
  );
  if (logoB64) {
    doc.addImage(logoB64, "PNG", ML, 12, 85, 30);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    st(WHITE);
    doc.text("COVEZI IVECO", ML, 34);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  st(WHITE);
  doc.text("FICHA DO VEÍCULO", PW - MR, 28, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  st([186, 214, 255] as [number,number,number]);
  doc.text(`Gerado em ${fmtDatetime(new Date())}`, PW - MR, 28 + LH_SMALL, { align: "right" });

  y = HEADER_H + 12;

  // ── Modelo + badges ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  st(DARK);
  const modeloLines: string[] = doc.splitTextToSize(fmt(veiculo.modelo), CW);
  doc.text(modeloLines, ML, y);
  y += modeloLines.length * 14 * 1.25 + 4;

  // Badges
  const status      = (veiculo.status ?? "").toUpperCase();
  const statusColor = status === "LIVRE" ? GREEN : status === "RESERVADO" ? AMBER : GRAY;
  const BADGE_H     = 13;
  const BADGE_PAD   = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const statusW = doc.getTextWidth(status) + BADGE_PAD * 2;
  sf(statusColor);
  doc.roundedRect(ML, y, statusW, BADGE_H, 2, 2, "F");
  st(WHITE);
  doc.text(status, ML + statusW / 2, y + BADGE_H / 2 + 7 * 0.35, { align: "center" });

  if (Math.abs(veiculo.diasEstoque ?? 0) > 180) {
    const critW = doc.getTextWidth("CRÍTICO") + BADGE_PAD * 2;
    sf(RED);
    doc.roundedRect(ML + statusW + 6, y, critW, BADGE_H, 2, 2, "F");
    st(WHITE);
    doc.text("CRÍTICO", ML + statusW + 6 + critW / 2, y + BADGE_H / 2 + 7 * 0.35, { align: "center" });
  }

  y += BADGE_H + 7;

  // Chassi / NF
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS_SMALL);
  st(GRAY);
  doc.text(
    `Chassi: ${fmt(veiculo.chassi)}${veiculo.nf ? `   ·   NF: ${veiculo.nf}` : ""}`,
    ML, y,
  );
  y += LH_SMALL + 6;

  // Separador
  sd([203, 213, 225]);
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + CW, y);
  y += 10;

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

  // ── Histórico (continua em páginas adicionais se necessário) ──────────────
  if (historico.length > 0) {
    sectionTitle(`Histórico de Alterações (${historico.length} registros)`);

    historico.forEach((entry, idx) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_VALUE);
      const changeLines = (entry.valorAnterior || entry.valorNovo)
        ? doc.splitTextToSize(
            [
              entry.valorAnterior ? `De: "${entry.valorAnterior}"` : "",
              entry.valorNovo     ? `Para: "${entry.valorNovo}"`   : "",
            ].filter(Boolean).join("   →   "),
            CW - 50,
          )
        : [];
      const obsLines = entry.observacao
        ? doc.splitTextToSize(entry.observacao, CW - 50)
        : [];

      const eventH =
        LH_VALUE + 3 +
        (entry.usuarioNome ? LH_SMALL + 2 : 0) +
        (changeLines.length > 0 ? changeLines.length * LH_SMALL + 12 : 0) +
        (obsLines.length    > 0 ? obsLines.length    * LH_SMALL + 4  : 0) +
        10;

      ensureSpace(eventH);

      const rowStartY = y;
      const CX = ML + 8;
      const CY = rowStartY + 8;

      sf(PRIMARY);
      doc.circle(CX, CY, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      st(WHITE);
      doc.text(String(historico.length - idx), CX, CY + 6.5 * 0.35, { align: "center" });

      const TX = ML + 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(FS_VALUE);
      st(DARK);
      doc.text(tipoLabel(entry.tipo, entry.campo), TX, rowStartY + LH_VALUE);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS_SMALL);
      st(GRAY);
      doc.text(fmtDatetime(entry.createdAt), PW - MR, rowStartY + LH_VALUE, { align: "right" });

      y = rowStartY + LH_VALUE + 3;

      if (entry.usuarioNome) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(FS_SMALL);
        st(GRAY);
        doc.text(`por ${entry.usuarioNome}`, TX, y + LH_SMALL);
        y += LH_SMALL + 3;
      }

      if (changeLines.length > 0) {
        const boxPadV = 5;
        const boxPadH = 7;
        const boxH    = changeLines.length * LH_SMALL + boxPadV * 2;
        sf(LIGHT);
        sd([203, 213, 225]);
        doc.setLineWidth(0.4);
        doc.roundedRect(TX, y, CW - TX + ML, boxH, 2, 2, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_SMALL);
        st(DARK);
        doc.text(changeLines, TX + boxPadH, y + boxPadV + LH_SMALL * 0.85);
        y += boxH + 5;
      }

      if (obsLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(FS_SMALL);
        st(GRAY);
        doc.text(obsLines, TX, y + LH_SMALL);
        y += obsLines.length * LH_SMALL + 4;
      }

      y += 8;

      if (idx < historico.length - 1) {
        sd([226, 232, 240]);
        doc.setLineWidth(0.4);
        doc.line(TX, y - 3, ML + CW, y - 3);
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
    doc.setLineWidth(0.4);
    doc.line(0, PH - FOOT, PW, PH - FOOT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    st(GRAY);
    doc.text("Covezi Iveco · Sistema de Gestão de Estoque", ML, PH - FOOT / 2 + 7 * 0.35);
    doc.text(`Página ${p} de ${totalPages}`, PW - MR, PH - FOOT / 2 + 7 * 0.35, { align: "right" });
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const fileName = `veiculo-${
    (veiculo.chassi ?? veiculo.id ?? "sem-chassi").toString().replace(/\s+/g, "-")
  }.pdf`;
  doc.save(fileName);
}
