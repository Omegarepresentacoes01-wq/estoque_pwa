import jsPDF from "jspdf";

const LOGO_URL = "https://static.manus.space/files/covezi-logo-main.png";
const PRIMARY = [0, 82, 165] as [number, number, number];     // azul Covezi
const DARK    = [15, 23, 42] as [number, number, number];     // slate-900
const GRAY    = [100, 116, 139] as [number, number, number];  // slate-500
const LIGHT   = [241, 245, 249] as [number, number, number];  // slate-100
const WHITE   = [255, 255, 255] as [number, number, number];
const RED     = [220, 38, 38] as [number, number, number];
const GREEN   = [22, 163, 74] as [number, number, number];
const AMBER   = [217, 119, 6] as [number, number, number];

function fmt(val: string | number | null | undefined): string {
  if (val == null || val === "") return "—";
  return String(val);
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  try { return new Date(val).toLocaleDateString("pt-BR"); } catch { return String(val); }
}

function fmtDatetime(val: string | Date | null | undefined): string {
  if (!val) return "—";
  try { return new Date(val).toLocaleString("pt-BR"); } catch { return String(val); }
}

function tipoLabel(tipo: string, campo?: string | null): string {
  if (tipo === "status_change") return "Status alterado";
  if (tipo === "cliente_change") return "Cliente alterado";
  if (tipo === "localizacao_change") return "Localização alterada";
  if (tipo === "campo_change" && campo) {
    const labels: Record<string, string> = {
      observacao: "Observação atualizada", implemento: "Implemento atualizado",
      pneu: "Pneu atualizado", defletor: "Defletor atualizado",
      diasEstoque: "Dias de estoque atualizados", diasPatio: "Dias de pátio atualizados",
      cor: "Cor atualizada", anoMod: "Ano/Mod atualizado",
      dataChegadaCovezi: "Data de chegada atualizada", dataAtual: "Data atual atualizada",
    };
    return labels[campo] ?? `Campo "${campo}" alterado`;
  }
  if (tipo === "criado") return "Veículo cadastrado";
  return "Registro editado";
}

function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
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

export async function gerarPDFVeiculo(veiculo: any, historico: any[]): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210; // page width
  const ML = 14;  // margin left
  const MR = 14;  // margin right
  const CW = PW - ML - MR; // content width
  let y = 0;

  // ── Helpers de desenho ────────────────────────────────────────────────────

  const setFill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setTxt  = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  function checkPage(needed = 10) {
    if (y + needed > 280) {
      doc.addPage();
      y = 14;
    }
  }

  function sectionTitle(title: string) {
    checkPage(12);
    setFill(LIGHT);
    setDraw(PRIMARY);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, 8, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTxt(PRIMARY);
    doc.text(title.toUpperCase(), ML + 3, y + 5.5);
    y += 11;
  }

  function infoRow(label: string, value: string, col: 0 | 1 = 0, colTotal = 1) {
    const colW = CW / colTotal;
    const x = ML + col * colW;
    checkPage(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(GRAY);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTxt(DARK);
    const lines = doc.splitTextToSize(value, colW - 4);
    doc.text(lines, x, y + 4);
    return Math.max(lines.length * 4.5 + 5, 10);
  }

  function twoColRows(rows: { label: string; value: string }[]) {
    let i = 0;
    while (i < rows.length) {
      const left  = rows[i];
      const right = rows[i + 1];
      checkPage(10);
      const hL = infoRow(left.label, left.value, 0, 2);
      const hR = right ? infoRow(right.label, right.value, 1, 2) : 0;
      y += Math.max(hL, hR, 10);
      // divider
      setDraw([226, 232, 240]);
      doc.setLineWidth(0.2);
      doc.line(ML, y - 1, ML + CW, y - 1);
      i += 2;
    }
  }

  // ── Cabeçalho ─────────────────────────────────────────────────────────────

  // Fundo azul
  setFill(PRIMARY);
  doc.rect(0, 0, PW, 38, "F");

  // Logo
  const logoB64 = await loadImageAsBase64(LOGO_URL);
  if (logoB64) {
    doc.addImage(logoB64, "PNG", ML, 6, 44, 14);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setTxt(WHITE);
    doc.text("COVEZI IVECO", ML, 16);
  }

  // Título direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setTxt(WHITE);
  doc.text("FICHA DO VEÍCULO", PW - MR, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt([186, 214, 255]);
  doc.text(`Gerado em ${fmtDatetime(new Date())}`, PW - MR, 20, { align: "right" });

  y = 44;

  // ── Título do veículo ─────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setTxt(DARK);
  doc.text(fmt(veiculo.modelo), ML, y);
  y += 6;

  // Status badge
  const status = (veiculo.status ?? "").toUpperCase();
  const statusColor = status === "LIVRE" ? GREEN : status === "RESERVADO" ? AMBER : GRAY;
  setFill(statusColor);
  doc.roundedRect(ML, y, 28, 6, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTxt(WHITE);
  doc.text(status, ML + 14, y + 4, { align: "center" });

  // Crítico badge
  const diasAbs = Math.abs(veiculo.diasEstoque ?? 0);
  if (diasAbs > 180) {
    setFill(RED);
    doc.roundedRect(ML + 31, y, 22, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(WHITE);
    doc.text("CRÍTICO", ML + 42, y + 4, { align: "center" });
  }

  y += 10;

  // Chassi / NF linha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setTxt(GRAY);
  const chassiLine = `Chassi: ${fmt(veiculo.chassi)}${veiculo.nf ? `   ·   NF: ${veiculo.nf}` : ""}`;
  doc.text(chassiLine, ML, y);
  y += 8;

  // Linha separadora
  setDraw([203, 213, 225]);
  doc.setLineWidth(0.4);
  doc.line(ML, y, ML + CW, y);
  y += 6;

  // ── Seção: Identificação ──────────────────────────────────────────────────

  sectionTitle("Identificação");
  twoColRows([
    { label: "NF",           value: fmt(veiculo.nf) },
    { label: "Código",       value: fmt(veiculo.cod) },
    { label: "Modelo",       value: fmt(veiculo.modelo) },
    { label: "Ano / Modelo", value: fmt(veiculo.anoMod) },
    { label: "Cor",          value: fmt(veiculo.cor) },
    { label: "Chassi",       value: fmt(veiculo.chassi) },
    { label: "Data Emissão", value: fmtDate(veiculo.dataEmissao) },
    { label: "",             value: "" },
  ]);

  // ── Seção: Localização e Datas ────────────────────────────────────────────

  sectionTitle("Localização e Datas");
  twoColRows([
    { label: "Estoque Físico",   value: fmt(veiculo.estoquesFisico) },
    { label: "Chegada COVEZI",   value: fmtDate(veiculo.dataChegadaCovezi) },
    { label: "Data Atual",       value: fmtDate(veiculo.dataAtual) },
    { label: "Dias em Estoque",  value: `${Math.abs(veiculo.diasEstoque ?? 0)} dias` },
    { label: "Dias de Pátio",    value: `${Math.abs(veiculo.diasPatio ?? 0)} dias` },
    { label: "",                 value: "" },
  ]);

  // ── Seção: Status e Comercial ─────────────────────────────────────────────

  sectionTitle("Status e Comercial");
  twoColRows([
    { label: "Status",     value: fmt(veiculo.status) },
    { label: "Cliente",    value: fmt(veiculo.cliente) },
    { label: "Observação", value: fmt(veiculo.observacao) },
    { label: "",           value: "" },
  ]);

  // ── Seção: Equipamentos ───────────────────────────────────────────────────

  sectionTitle("Equipamentos");
  twoColRows([
    { label: "Implemento", value: fmt(veiculo.implemento) },
    { label: "Pneu",       value: fmt(veiculo.pneu) },
    { label: "Defletor",   value: fmt(veiculo.defletor) },
    { label: "",           value: "" },
  ]);

  // ── Seção: Histórico de Alterações ────────────────────────────────────────

  if (historico.length > 0) {
    sectionTitle(`Histórico de Alterações (${historico.length} registros)`);

    historico.forEach((entry, idx) => {
      checkPage(18);

      // Número do evento
      setFill(PRIMARY);
      doc.circle(ML + 3.5, y + 3.5, 3.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setTxt(WHITE);
      doc.text(String(historico.length - idx), ML + 3.5, y + 4.5, { align: "center" });

      // Tipo do evento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setTxt(DARK);
      doc.text(tipoLabel(entry.tipo, entry.campo), ML + 10, y + 4);

      // Usuário
      if (entry.usuarioNome) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        setTxt(GRAY);
        doc.text(`por ${entry.usuarioNome}`, ML + 10, y + 9);
      }

      // Data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setTxt(GRAY);
      doc.text(fmtDatetime(entry.createdAt), PW - MR, y + 4, { align: "right" });

      y += 12;

      // Mudança de valor
      if (entry.valorAnterior || entry.valorNovo) {
        checkPage(10);
        const antes = entry.valorAnterior ? `De: "${entry.valorAnterior}"` : "";
        const depois = entry.valorNovo ? `Para: "${entry.valorNovo}"` : "";
        const changeText = [antes, depois].filter(Boolean).join("  →  ");
        setFill(LIGHT);
        setDraw([203, 213, 225]);
        doc.setLineWidth(0.2);
        const lines = doc.splitTextToSize(changeText, CW - 12);
        const boxH = lines.length * 4.5 + 4;
        doc.roundedRect(ML + 8, y, CW - 8, boxH, 1, 1, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setTxt(DARK);
        doc.text(lines, ML + 12, y + 3.5);
        y += boxH + 2;
      }

      // Observação
      if (entry.observacao) {
        checkPage(8);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        setTxt(GRAY);
        const obsLines = doc.splitTextToSize(entry.observacao, CW - 12);
        doc.text(obsLines, ML + 10, y);
        y += obsLines.length * 4 + 2;
      }

      // Linha divisória entre eventos
      if (idx < historico.length - 1) {
        setDraw([226, 232, 240]);
        doc.setLineWidth(0.2);
        doc.line(ML + 8, y, ML + CW, y);
        y += 4;
      }
    });
  }

  // ── Rodapé em todas as páginas ────────────────────────────────────────────

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setFill(LIGHT);
    doc.rect(0, 287, PW, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setTxt(GRAY);
    doc.text("Covezi Iveco · Sistema de Gestão de Estoque", ML, 293);
    doc.text(`Página ${p} de ${totalPages}`, PW - MR, 293, { align: "right" });
  }

  // ── Download ──────────────────────────────────────────────────────────────

  const fileName = `veiculo-${(veiculo.chassi ?? veiculo.id ?? "sem-chassi").toString().replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
}
