import { useState, useEffect } from "react";
import { Smartphone, Share2, Plus, Download, Chrome, MoreVertical, Home, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StepCard({ number, title, description, icon: Icon }: {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex gap-4 items-start p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="font-semibold text-foreground">{title}</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TipCard({ text }: { text: string }) {
  return (
    <div className="flex gap-3 items-start p-3 rounded-lg bg-primary/10 border border-primary/20">
      <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

export default function Instalacao() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // Detectar se já está instalado como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação do Chrome/Android
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Instalar como App</h1>
        <p className="text-muted-foreground text-sm">
          Adicione o Estoque Covezi Iveco à tela inicial do seu celular para acesso rápido, sem precisar abrir o navegador.
        </p>
      </div>

      {/* Status de instalação */}
      {isInstalled ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30">
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-600 dark:text-green-400">App já instalado!</p>
            <p className="text-sm text-muted-foreground">Você está acessando o app em modo instalado.</p>
          </div>
        </div>
      ) : showInstallBtn ? (
        <button
          onClick={handleInstall}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors border-2 border-primary"
        >
          <Download className="w-5 h-5" />
          Instalar App Agora
        </button>
      ) : null}

      {/* Benefícios */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Vantagens do App Instalado
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {[
            { label: "Acesso rápido", desc: "Ícone na tela inicial" },
            { label: "Tela cheia", desc: "Sem barra do navegador" },
            { label: "Funciona offline", desc: "Dados em cache local" },
            { label: "Mais rápido", desc: "Carregamento instantâneo" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-muted border border-border text-center">
              <p className="font-semibold text-sm text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Instruções por plataforma */}
      <Tabs defaultValue="android" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11">
          <TabsTrigger value="android" className="flex items-center gap-2 font-semibold">
            <span className="text-base">🤖</span> Android
          </TabsTrigger>
          <TabsTrigger value="ios" className="flex items-center gap-2 font-semibold">
            <span className="text-base">🍎</span> iPhone / iPad
          </TabsTrigger>
        </TabsList>

        {/* Android */}
        <TabsContent value="android" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-2 text-xs font-semibold">
              <Chrome className="w-3 h-3 mr-1" /> Google Chrome
            </Badge>
            <span className="text-xs text-muted-foreground">Recomendado</span>
          </div>

          <div className="space-y-3">
            <StepCard
              number={1}
              title="Abra o Chrome"
              description={`Acesse seuestoqueapp.com.br pelo Google Chrome no seu Android. Outros navegadores como Samsung Internet também funcionam.`}
              icon={Chrome}
            />
            <StepCard
              number={2}
              title="Toque nos 3 pontos (⋮)"
              description="No canto superior direito do Chrome, toque no ícone de menu com três pontos verticais."
              icon={MoreVertical}
            />
            <StepCard
              number={3}
              title='Selecione "Adicionar à tela inicial"'
              description='No menu que abrir, procure a opção "Adicionar à tela inicial" ou "Instalar app". Toque nela.'
              icon={Plus}
            />
            <StepCard
              number={4}
              title="Confirme a instalação"
              description='Uma caixa de diálogo aparecerá com o nome "Estoque Covezi Iveco". Toque em "Adicionar" ou "Instalar" para confirmar.'
              icon={Download}
            />
            <StepCard
              number={5}
              title="Pronto! Acesse pela tela inicial"
              description="O ícone do app aparecerá na sua tela inicial ou gaveta de apps. Toque nele para abrir em tela cheia."
              icon={Home}
            />
          </div>

          <div className="space-y-2">
            <TipCard text="Se aparecer um banner azul 'Adicionar ao início' na parte inferior da tela, basta tocá-lo para instalar diretamente." />
            <TipCard text="No Samsung Internet: toque no ícone de hambúrguer (☰) → 'Adicionar página a' → 'Tela inicial'." />
          </div>
        </TabsContent>

        {/* iOS */}
        <TabsContent value="ios" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-2 text-xs font-semibold">
              🌐 Safari
            </Badge>
            <span className="text-xs text-muted-foreground">Obrigatório no iPhone</span>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border-2 border-amber-500/30 mb-3">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              ⚠️ No iPhone e iPad, a instalação só funciona pelo <strong>Safari</strong>. Chrome e outros navegadores não suportam essa função no iOS.
            </p>
          </div>

          <div className="space-y-3">
            <StepCard
              number={1}
              title="Abra o Safari"
              description={`Acesse seuestoqueapp.com.br pelo Safari (o navegador padrão do iPhone com ícone de bússola azul).`}
              icon={Smartphone}
            />
            <StepCard
              number={2}
              title="Toque no botão Compartilhar"
              description="Na barra inferior do Safari, toque no ícone de compartilhar — um quadrado com uma seta apontando para cima (⬆)."
              icon={Share2}
            />
            <StepCard
              number={3}
              title='Selecione "Adicionar à Tela de Início"'
              description='Role a lista de opções para baixo e toque em "Adicionar à Tela de Início" (ícone de quadrado com um +).'
              icon={Plus}
            />
            <StepCard
              number={4}
              title="Confirme o nome e adicione"
              description='Você pode editar o nome se quiser. Depois toque em "Adicionar" no canto superior direito.'
              icon={CheckCircle2}
            />
            <StepCard
              number={5}
              title="Acesse pela tela inicial"
              description="O ícone do Estoque Covezi Iveco aparecerá na sua tela inicial. Toque nele para abrir em tela cheia, sem a barra do Safari."
              icon={Home}
            />
          </div>

          <div className="space-y-2">
            <TipCard text="No iPad, o botão de compartilhar fica na barra superior, ao lado da barra de endereços." />
            <TipCard text="O app instalado no iPhone funciona offline — você pode consultar o estoque mesmo sem internet." />
          </div>
        </TabsContent>
      </Tabs>

      {/* Nota final */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3 items-start">
            <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">Funciona em qualquer dispositivo</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                O Estoque Covezi Iveco é um <strong>Progressive Web App (PWA)</strong> — funciona como app nativo no Android, iPhone, iPad e também pode ser instalado no computador pelo Chrome. Não precisa de loja de aplicativos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
