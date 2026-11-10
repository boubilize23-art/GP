import { useState } from "react";
import {
  BookOpen, ChevronDown, ChevronUp, LayoutDashboard, ShoppingCart,
  ShoppingBag, Users, Building2, TrendingUp, Package, Warehouse,
  Settings, Shield, Key, UserCog, ArrowRight,
  CheckCircle, AlertTriangle, Info, Star,
  FileText, BarChart2, Lock, Globe, Calendar,
  DollarSign, Receipt, Crown, Briefcase, User as UserIcon,
  Unlock, Trash2, Ban, PlusCircle, Search, RefreshCw,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

function Box({ color, icon, title, children }: { color: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border-2 ${color} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h4 className="font-bold text-slate-800 text-base">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Step({ n, text, sub }: { n: number; text: string; sub?: string }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{n}</div>
      <div>
        <p className="font-semibold text-slate-800">{text}</p>
        {sub && <p className="text-slate-500 text-sm mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Alert({ type, children }: { type: "info" | "warning" | "success"; children: React.ReactNode }) {
  const cfg = {
    info:    { bg: "bg-blue-50 border-blue-200",     icon: <Info size={18} className="text-blue-500 flex-shrink-0" /> },
    warning: { bg: "bg-amber-50 border-amber-200",   icon: <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" /> },
    success: { bg: "bg-emerald-50 border-emerald-200",icon: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" /> },
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg[type].bg}`}>
      {cfg[type].icon}
      <p className="text-slate-700 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function FlowArrow() {
  return <div className="flex justify-center my-1"><ArrowRight size={18} className="text-violet-400 rotate-90" /></div>;
}

function FlowBox({ label, color, sub }: { label: string; color: string; sub?: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center border-2 ${color}`}>
      <p className="font-bold text-sm">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>{headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left font-bold text-slate-700">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-slate-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuidePage() {
  const [openSection, setOpenSection] = useState<string | null>("intro");

  const sections: Section[] = [

    // ── 1. Introduction ──────────────────────────────────────────────────────
    {
      id: "intro", title: "Introduction — Vue d'ensemble", icon: <BookOpen size={20} />, color: "violet",
      content: (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-6 border border-violet-100">
            <h3 className="text-xl font-black text-violet-800 mb-1">GestioPro</h3>
            <p className="text-slate-600 text-sm mb-1">Logiciel de gestion commerciale et comptable</p>
            <p className="text-violet-600 font-semibold text-sm">Développé par <strong>Aboubacar Boubou Keita</strong></p>
          </div>

          <p className="text-slate-700 leading-relaxed">
            GestioPro est un logiciel de gestion commerciale complet. Il vous permet de gérer vos ventes, achats, clients, fournisseurs, stocks, résultats financiers et déclarations de TVA — tout en synchronisant automatiquement les données entre chaque module.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <LayoutDashboard size={18} />, label: "Tableau de bord", color: "bg-violet-100 text-violet-700" },
              { icon: <ShoppingCart size={18} />, label: "Ventes", color: "bg-blue-100 text-blue-700" },
              { icon: <ShoppingBag size={18} />, label: "Achats", color: "bg-orange-100 text-orange-700" },
              { icon: <Users size={18} />, label: "Clients", color: "bg-emerald-100 text-emerald-700" },
              { icon: <Building2 size={18} />, label: "Fournisseurs", color: "bg-amber-100 text-amber-700" },
              { icon: <Warehouse size={18} />, label: "Stock", color: "bg-cyan-100 text-cyan-700" },
              { icon: <Receipt size={18} />, label: "TVA", color: "bg-pink-100 text-pink-700" },
              { icon: <TrendingUp size={18} />, label: "Résultats", color: "bg-green-100 text-green-700" },
            ].map((m, i) => (
              <div key={i} className={`flex items-center gap-2 p-3 rounded-xl ${m.color} font-semibold text-sm`}>
                {m.icon} {m.label}
              </div>
            ))}
          </div>

          <Alert type="success">
            Toutes les données sont <strong>automatiquement synchronisées</strong> entre les modules. Une vente enregistrée met à jour instantanément : le client, la créance, le stock, le CA encaissé, le tableau de bord et la déclaration TVA.
          </Alert>

          {/* Schéma de flux global */}
          <Box color="border-violet-200 bg-violet-50" icon={<BarChart2 size={20} className="text-violet-600" />} title="Flux de données global">
            <div className="flex flex-col items-center gap-1 py-2">
              <FlowBox label="Produits" color="border-slate-300 bg-white" sub="Catalogue + prix + stock" />
              <FlowArrow />
              <div className="flex gap-4 w-full">
                <FlowBox label="Ventes → Clients" color="border-blue-300 bg-blue-50" sub="CA + Créances" />
                <FlowBox label="Achats → Fournisseurs" color="border-orange-300 bg-orange-50" sub="Dépenses + Dettes" />
              </div>
              <FlowArrow />
              <FlowBox label="Déclaration TVA" color="border-pink-300 bg-pink-50" sub="TVA Facturée / Récupérable" />
              <FlowArrow />
              <FlowBox label="Tableau de bord" color="border-violet-400 bg-violet-100" sub="CA Encaissé / Achats payés / Bénéfice" />
            </div>
          </Box>
        </div>
      ),
    },

    // ── 2. Connexion & Sécurité ──────────────────────────────────────────────
    {
      id: "auth", title: "Connexion, Inscription & Sécurité", icon: <Shield size={20} />, color: "red",
      content: (
        <div className="space-y-5">
          <Alert type="info">
            GestioPro dispose d'un système d'authentification sécurisé avec <strong>3 niveaux de rôles</strong>, protection contre le brute-force, session persistante, et chiffrement SHA-256 des mots de passe.
          </Alert>

          {/* Hiérarchie des rôles */}
          <Box color="border-red-200 bg-red-50" icon={<Crown size={20} className="text-red-600" />} title="Hiérarchie des rôles">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-100 rounded-xl border border-red-200">
                <Crown size={18} className="text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">👑 Administrateur</p>
                  <p className="text-red-700 text-sm">Accès total — voit tout, gère managers et utilisateurs, approuve tous les achats, crée la clé d'organisation</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-100 rounded-xl border border-amber-200">
                <Briefcase size={18} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800">📊 Manager</p>
                  <p className="text-amber-700 text-sm">Supervise ses utilisateurs, approuve leurs bons d'achat, peut bloquer/supprimer leurs comptes</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-100 rounded-xl border border-blue-200">
                <UserIcon size={18} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-800">👤 Utilisateur</p>
                  <p className="text-blue-700 text-sm">Saisit ventes et demandes d'achat. Les achats doivent être approuvés par le manager ou l'admin</p>
                </div>
              </div>
            </div>
          </Box>

          {/* Inscription */}
          <Box color="border-blue-200 bg-blue-50" icon={<Key size={20} className="text-blue-600" />} title="Clé d'organisation">
            <div className="space-y-3 text-sm text-slate-700">
              <p><strong>L'administrateur</strong> reçoit une <strong>clé d'inscription administrateur</strong> à usage unique (ex: <code className="bg-slate-200 px-1 rounded">GEST-ABCD-1234</code>) : sa société est <strong>créée automatiquement</strong>, avec une licence de 30 jours.</p>
              <p><strong>Le directeur et l'utilisateur</strong> reçoivent une <strong>clé d'invitation par poste</strong> : elle fixe leur rôle et leur encadrant, et elle est réemployable.</p>
              <Alert type="warning">
                Sans clé valide, personne ne peut créer de compte : la base refuse l'inscription.
                L'administrateur de société distribue lui-même les clés de son équipe, sans limite de nombre.
              </Alert>
            </div>
          </Box>

          <Box color="border-slate-200 bg-slate-50" icon={<Lock size={20} className="text-slate-600" />} title="Mesures de sécurité">
            <Table
              headers={["Mesure", "Détail"]}
              rows={[
                ["SHA-256", "Mots de passe hachés — jamais stockés en clair"],
                ["Anti brute-force", "Blocage après 5 tentatives échouées"],
                ["Lockout 15 min", "Compte temporairement bloqué avec compte à rebours"],
                ["Session 24h", "Reconnexion automatique sans re-saisir les identifiants"],
                ["Remember me", "Identifiants obfusqués en Base64 (optionnel)"],
                ["Sanitisation XSS", "Tous les champs nettoyés à la saisie"],
              ]}
            />
          </Box>

          {/* Comptes démo */}
          <Box color="border-emerald-200 bg-emerald-50" icon={<CheckCircle size={20} className="text-emerald-600" />} title="Comptes de démonstration">
            <Table
              headers={["Rôle", "Identifiant", "Mot de passe"]}
              rows={[
                [<span className="flex items-center gap-1 text-red-600 font-bold"><Crown size={13} /> Admin</span>, "admin", "Admin@2025"],
                [<span className="flex items-center gap-1 text-amber-600 font-bold"><Briefcase size={13} /> Manager</span>, "manager", "Manager@2025"],
                [<span className="flex items-center gap-1 text-blue-600 font-bold"><UserIcon size={13} /> Utilisateur</span>, "utilisateur", "User@2025"],
              ]}
            />
          </Box>
        </div>
      ),
    },

    // ── 3. Tableau de bord ──────────────────────────────────────────────────
    {
      id: "dashboard", title: "Tableau de bord", icon: <LayoutDashboard size={20} />, color: "violet",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">Le tableau de bord est la page d'accueil. Il affiche une vue synthétique de votre activité financière en temps réel.</p>

          <Box color="border-violet-200 bg-violet-50" icon={<DollarSign size={20} className="text-violet-600" />} title="3 KPIs principaux (argent réellement encaissé)">
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-white rounded-xl p-4 border border-violet-200 text-center">
                <p className="text-violet-700 font-bold text-lg">CA Encaissé</p>
                <p className="text-slate-500 text-xs mt-1">Σ montants réellement reçus des clients</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-orange-200 text-center">
                <p className="text-orange-700 font-bold text-lg">Achats Payés</p>
                <p className="text-slate-500 text-xs mt-1">Σ montants réellement versés aux fournisseurs</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-emerald-200 text-center">
                <p className="text-emerald-700 font-bold text-lg">Bénéfice Encaissé</p>
                <p className="text-slate-500 text-xs mt-1">CA Encaissé − Achats Payés</p>
              </div>
            </div>
          </Box>

          <Alert type="info">
            Les KPIs du tableau de bord reflètent uniquement <strong>l'argent réellement encaissé</strong>, pas les montants facturés. Si un client n'a pas encore payé, sa vente n'est pas comptée dans le CA encaissé.
          </Alert>

          <Box color="border-slate-200 bg-slate-50" icon={<BarChart2 size={20} className="text-slate-600" />} title="Graphiques du tableau de bord">
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2"><span className="text-violet-500 font-bold">▶</span> <strong>Évolution mensuelle :</strong> CA encaissé vs Achats payés sur 6 mois</li>
              <li className="flex gap-2"><span className="text-violet-500 font-bold">▶</span> <strong>Répartition :</strong> diagramme en secteurs par catégorie de produits</li>
              <li className="flex gap-2"><span className="text-violet-500 font-bold">▶</span> <strong>Activité récente :</strong> dernières ventes et achats</li>
              <li className="flex gap-2"><span className="text-violet-500 font-bold">▶</span> <strong>Alertes stock :</strong> produits proches du seuil minimal</li>
              <li className="flex gap-2"><span className="text-violet-500 font-bold">▶</span> <strong>Top clients :</strong> les clients avec le plus de CA encaissé</li>
            </ul>
          </Box>
        </div>
      ),
    },

    // ── 4. Produits & Catégories ─────────────────────────────────────────────
    {
      id: "products", title: "Produits & Catégories", icon: <Package size={20} />, color: "cyan",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">Les produits sont la base de toute l'application. Chaque vente et chaque achat est lié à des produits du catalogue.</p>

          <Box color="border-cyan-200 bg-cyan-50" icon={<PlusCircle size={20} className="text-cyan-600" />} title="Créer un produit">
            <div className="divide-y divide-cyan-100">
              <Step n={1} text="Cliquez sur « + Nouveau produit »" />
              <Step n={2} text="Remplissez le nom, l'unité (kg, L, pièce...)" />
              <Step n={3} text="Choisissez ou créez une catégorie" sub="Tapez dans le champ et cliquez « Créer la catégorie »" />
              <Step n={4} text="Saisissez le prix d'achat et le prix de vente" sub="La marge est calculée automatiquement" />
              <Step n={5} text="Définissez le stock initial et le seuil minimal" sub="Une alerte s'affiche quand le stock atteint le seuil" />
              <Step n={6} text="Indiquez le taux de TVA si applicable" sub="Laissez 0 si exonéré de TVA" />
            </div>
          </Box>

          <Table
            headers={["Champ", "Obligatoire", "Description"]}
            rows={[
              ["Nom", "✅", "Nom du produit ou service"],
              ["Catégorie", "✅", "Choisir ou créer manuellement"],
              ["Unité", "✅", "kg, litre, pièce, heure..."],
              ["Prix achat", "✅", "Coût d'acquisition"],
              ["Prix vente", "✅", "Prix de vente au client"],
              ["Stock initial", "✅", "Quantité de départ"],
              ["Seuil minimal", "✅", "Déclenche l'alerte de stock bas"],
              ["Taux TVA (%)", "❌", "Ex: 18, 20. Laisser 0 si pas de TVA"],
            ]}
          />

          <Alert type="warning">
            Le stock est automatiquement <strong>décrémenté à chaque vente</strong> et <strong>incrémenté à chaque achat</strong>. Vous ne pouvez pas vendre un produit dont le stock est à 0.
          </Alert>
        </div>
      ),
    },

    // ── 5. Ventes & Facturation ──────────────────────────────────────────────
    {
      id: "sales", title: "Ventes & Facturation", icon: <ShoppingCart size={20} />, color: "blue",
      content: (
        <div className="space-y-5">
          <Box color="border-blue-200 bg-blue-50" icon={<ShoppingCart size={20} className="text-blue-600" />} title="Créer une vente">
            <div className="divide-y divide-blue-100">
              <Step n={1} text="Cliquez sur « + Nouvelle vente »" />
              <Step n={2} text="Sélectionnez ou créez un client" sub="Si le client existe, ses infos sont pré-remplies" />
              <Step n={3} text="Ajoutez les produits" sub="Quantité, prix unitaire — le total HT est calculé automatiquement" />
              <Step n={4} text="La TVA est calculée automatiquement" sub="Si le produit a un taux TVA configuré" />
              <Step n={5} text="Indiquez le montant encaissé (peut être 0)" sub="Si 0 → créance automatique sur le client" />
              <Step n={6} text="Validez — la vente, la créance et le stock sont mis à jour instantanément" />
            </div>
          </Box>

          {/* Flux complet */}
          <Box color="border-slate-200 bg-slate-50" icon={<ArrowRight size={20} className="text-slate-600" />} title="Ce qui se passe automatiquement lors d'une vente">
            <div className="flex flex-col gap-1 py-2">
              <FlowBox label="Vente enregistrée" color="border-blue-300 bg-blue-50" sub="Ref, date, client, articles, TVA, total TTC" />
              <FlowArrow />
              <FlowBox label="Stock décrémenté" color="border-cyan-300 bg-cyan-50" sub="Pour chaque article de la vente" />
              <FlowArrow />
              <FlowBox label="Créance client mise à jour" color="border-amber-300 bg-amber-50" sub="balance += (total − encaissé)" />
              <FlowArrow />
              <FlowBox label="TVA Facturée du mois" color="border-pink-300 bg-pink-50" sub="Ajoutée à la déclaration TVA" />
              <FlowArrow />
              <FlowBox label="Tableau de bord mis à jour" color="border-violet-300 bg-violet-50" sub="CA encaissé, graphiques, activité récente" />
            </div>
          </Box>

          <Box color="border-emerald-200 bg-emerald-50" icon={<FileText size={20} className="text-emerald-600" />} title="Facture & Impression">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>📄 Cliquez sur l'icône <strong>Facture</strong> ou <strong>Imprimante</strong> sur chaque vente</li>
              <li>📋 La facture s'affiche en format A4 professionnel sur une seule page</li>
              <li>🖨️ Bouton <strong>« Imprimer / PDF »</strong> pour impression ou export PDF</li>
              <li>🔖 Tampon de statut : <strong>PAYÉE</strong> / <strong>PARTIELLE</strong> / <strong>IMPAYÉE</strong></li>
              <li>💧 Filigrane « IMPAYÉ » affiché en fond si non réglée</li>
            </ul>
          </Box>

          <Alert type="info">
            <strong>Règle TVA Ventes :</strong> la TVA est calculée sur le montant HT. Montant TVA = HT × taux. Montant TTC = HT + TVA. La créance du client est toujours basée sur le <strong>montant TTC</strong>.
          </Alert>
        </div>
      ),
    },

    // ── 6. Achats & Bons de commande ─────────────────────────────────────────
    {
      id: "purchases", title: "Achats & Bons de commande", icon: <ShoppingBag size={20} />, color: "orange",
      content: (
        <div className="space-y-5">
          <Alert type="warning">
            <strong>Règle d'approbation :</strong> les <strong>utilisateurs</strong> ne peuvent pas enregistrer un achat directement. Ils soumettent une demande qui doit être <strong>approuvée par un manager ou un administrateur</strong>.
          </Alert>

          <Box color="border-orange-200 bg-orange-50" icon={<ShoppingBag size={20} className="text-orange-600" />} title="Workflow achat selon le rôle">
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-bold text-red-800 flex items-center gap-2 mb-2"><Crown size={14} /> Admin — Achat direct</p>
                <p className="text-red-700 text-sm">L'admin crée un achat directement. Il est enregistré immédiatement.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-bold text-amber-800 flex items-center gap-2 mb-2"><Briefcase size={14} /> Manager — Achat direct ou approbation</p>
                <p className="text-amber-700 text-sm">Le manager crée ses achats directement ET approuve les demandes de ses utilisateurs.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="font-bold text-blue-800 flex items-center gap-2 mb-2"><UserIcon size={14} /> Utilisateur — Demande d'achat</p>
                <p className="text-blue-700 text-sm">L'utilisateur soumet une demande. Elle apparaît dans les notifications du manager/admin pour approbation.</p>
              </div>
            </div>
          </Box>

          <Box color="border-slate-200 bg-slate-50" icon={<ArrowRight size={20} className="text-slate-600" />} title="Ce qui se passe automatiquement lors d'un achat approuvé">
            <div className="flex flex-col gap-1 py-2">
              <FlowBox label="Achat enregistré" color="border-orange-300 bg-orange-50" sub="Ref, date, fournisseur, articles, TVA, total TTC" />
              <FlowArrow />
              <FlowBox label="Stock incrémenté" color="border-cyan-300 bg-cyan-50" sub="Pour chaque article de l'achat" />
              <FlowArrow />
              <FlowBox label="Dette fournisseur mise à jour" color="border-amber-300 bg-amber-50" sub="balance += (total − déjà payé)" />
              <FlowArrow />
              <FlowBox label="TVA Récupérable du mois" color="border-pink-300 bg-pink-50" sub="Ajoutée à la déclaration TVA" />
              <FlowArrow />
              <FlowBox label="Tableau de bord mis à jour" color="border-violet-300 bg-violet-50" sub="Achats payés, graphiques" />
            </div>
          </Box>
        </div>
      ),
    },

    // ── 7. Clients & Créances ────────────────────────────────────────────────
    {
      id: "clients", title: "Clients & Créances", icon: <Users size={20} />, color: "emerald",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">Chaque client est automatiquement créé lors d'une vente. Les créances sont calculées et cumulées automatiquement.</p>

          <Box color="border-emerald-200 bg-emerald-50" icon={<Users size={20} className="text-emerald-600" />} title="Logique de cumul client">
            <div className="space-y-3 text-sm text-slate-700">
              <p>Un même client peut avoir <strong>plusieurs ventes</strong>. Toutes ses créances sont <strong>cumulées automatiquement</strong>. Pas besoin de créer deux fiches pour le même client.</p>
              <div className="bg-white rounded-xl p-4 border border-emerald-200 font-mono text-xs">
                <p>01/02 → Vente A : 100 000 → Créance : 100 000</p>
                <p>03/03 → Vente B : 200 000 → Créance : 300 000</p>
                <p className="text-emerald-700 font-bold mt-2">Total créance Client A = 300 000</p>
              </div>
            </div>
          </Box>

          <Box color="border-blue-200 bg-blue-50" icon={<DollarSign size={20} className="text-blue-600" />} title="Encaissement & Statuts (2 statuts uniquement)">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">🔴</p>
                <p className="font-bold text-red-800">En créance</p>
                <p className="text-red-700 text-xs">Montant restant &gt; 0</p>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="font-bold text-emerald-800">Payé</p>
                <p className="text-emerald-700 text-xs">Montant restant = 0</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-700 space-y-2">
              <p><strong>Paiements partiels cumulés :</strong></p>
              <div className="bg-white rounded-xl p-3 border border-slate-200 font-mono text-xs space-y-1">
                <p>Total = 100 000</p>
                <p>Paiement 1 : 30 000 → Restant = 70 000 → En créance</p>
                <p>Paiement 2 : 20 000 → Restant = 50 000 → En créance</p>
                <p>Paiement 3 : 50 000 → Restant = 0 → ✅ Payé</p>
              </div>
            </div>
          </Box>

          <Alert type="success">
            Quand un client règle sa créance, le montant encaissé est automatiquement répercuté sur la ou les ventes correspondantes. Le statut des ventes passe de <strong>Impayée → Partielle → Payée</strong>.
          </Alert>
        </div>
      ),
    },

    // ── 8. Fournisseurs & Dettes ─────────────────────────────────────────────
    {
      id: "suppliers", title: "Fournisseurs & Dettes", icon: <Building2 size={20} />, color: "amber",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">Même logique que les clients, mais pour les achats. Chaque achat génère une dette fournisseur si non payé entièrement.</p>

          <Box color="border-amber-200 bg-amber-50" icon={<Building2 size={20} className="text-amber-600" />} title="Statuts fournisseurs (2 statuts uniquement)">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">🟠</p>
                <p className="font-bold text-orange-800">En dette</p>
                <p className="text-orange-700 text-xs">Montant restant &gt; 0</p>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="font-bold text-emerald-800">Payé</p>
                <p className="text-emerald-700 text-xs">Montant restant = 0</p>
              </div>
            </div>
          </Box>

          <Alert type="success">
            Quand vous réglez une dette fournisseur, le montant payé est répercuté sur le ou les achats correspondants. Le statut des achats passe de <strong>Impayé → Partiel → Payé</strong>.
          </Alert>

          <Box color="border-slate-200 bg-slate-50" icon={<RefreshCw size={20} className="text-slate-600" />} title="Liaison achat ↔ fournisseur">
            <Table
              headers={["Événement", "Achat", "Fournisseur"]}
              rows={[
                ["Achat créé (0 payé)", "total=100k, paid=0", "balance +100k, En dette"],
                ["Versement 1 : 40k", "paid=40k", "balance=60k, En dette"],
                ["Versement 2 : 60k", "paid=100k, Payé", "balance=0, ✅ Payé"],
              ]}
            />
          </Box>
        </div>
      ),
    },

    // ── 9. Stock ──────────────────────────────────────────────────────────────
    {
      id: "stock", title: "Stock", icon: <Warehouse size={20} />, color: "cyan",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">La rubrique Stock affiche uniquement les quantités en stock par produit. C'est une vue simple et directe, différente du tableau de bord.</p>

          <Box color="border-cyan-200 bg-cyan-50" icon={<Warehouse size={20} className="text-cyan-600" />} title="Ce que vous voyez dans la rubrique Stock">
            <Table
              headers={["Colonne", "Description"]}
              rows={[
                ["Produit / Catégorie", "Nom et famille du produit"],
                ["Entrées (période)", "Quantités reçues sur la période filtrée"],
                ["Sorties (période)", "Quantités vendues sur la période filtrée"],
                ["Stock restant", "Quantité actuelle disponible"],
                ["Seuil minimal", "Référence d'alerte configurée dans Produits"],
                ["Statut", "OK / Attention / Stock bas / Rupture"],
                ["Valeur stock", "Stock × prix d'achat en devise active"],
              ]}
            />
          </Box>

          <Box color="border-red-200 bg-red-50" icon={<AlertTriangle size={20} className="text-red-600" />} title="Alertes de stock">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex gap-3 items-center p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 font-bold">⛔ RUPTURE</span>
                <span>Stock = 0 — La vente est bloquée automatiquement</span>
              </div>
              <div className="flex gap-3 items-center p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 font-bold">⚠️ Stock bas</span>
                <span>Stock ≤ seuil minimal — Alerte dans le tableau de bord</span>
              </div>
              <div className="flex gap-3 items-center p-2 bg-amber-100 rounded-lg">
                <span className="text-amber-600 font-bold">📊 Attention</span>
                <span>Stock proche du seuil — Surveiller</span>
              </div>
            </div>
          </Box>

          <Alert type="info">
            Le stock se met à jour automatiquement : <strong>−1</strong> à chaque vente validée, <strong>+1</strong> à chaque achat enregistré/approuvé.
          </Alert>
        </div>
      ),
    },

    // ── 10. Déclaration TVA ───────────────────────────────────────────────────
    {
      id: "tva", title: "Déclaration de TVA", icon: <Receipt size={20} />, color: "pink",
      content: (
        <div className="space-y-5">
          <Alert type="info">
            La TVA n'est pas obligatoire. Si un produit n'a pas de taux TVA configuré, aucune TVA n'est calculée. Le système fonctionne avec ou sans TVA.
          </Alert>

          <Box color="border-pink-200 bg-pink-50" icon={<Receipt size={20} className="text-pink-600" />} title="Types de TVA">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="font-bold text-blue-800 mb-1">TVA Facturée</p>
                <p className="text-blue-700 text-sm">TVA collectée sur les <strong>ventes</strong></p>
                <p className="text-blue-600 text-xs mt-1 font-mono">= Σ TVA des ventes du mois</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="font-bold text-orange-800 mb-1">TVA Récupérable</p>
                <p className="text-orange-700 text-sm">TVA déductible sur les <strong>achats</strong></p>
                <p className="text-orange-600 text-xs mt-1 font-mono">= Σ TVA des achats du mois</p>
              </div>
            </div>
          </Box>

          <Box color="border-slate-200 bg-slate-50" icon={<BarChart2 size={20} className="text-slate-600" />} title="Formules de calcul mensuel">
            <div className="space-y-2 font-mono text-sm">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-slate-800">TVA Nette = TVA Facturée − TVA Récupérable − Crédit TVA Reporté</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-700 text-xs font-bold mb-1">Si TVA Nette &gt; 0</p>
                  <p className="text-red-800">TVA Due = TVA Nette</p>
                  <p className="text-red-600 text-xs">À payer le mois suivant</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <p className="text-emerald-700 text-xs font-bold mb-1">Si TVA Nette ≤ 0</p>
                  <p className="text-emerald-800">Crédit à reporter = |TVA Nette|</p>
                  <p className="text-emerald-600 text-xs">Reporté au mois actif suivant</p>
                </div>
              </div>
            </div>
          </Box>

          <Box color="border-amber-200 bg-amber-50" icon={<Calendar size={20} className="text-amber-600" />} title="Règle du crédit TVA reporté (IMPORTANT)">
            <div className="space-y-3 text-sm text-slate-700">
              <p>Le crédit TVA à reporter <strong>n'est reporté qu'au prochain mois ayant des opérations</strong>. Il ne s'étale pas sur tous les mois vides.</p>
              <div className="bg-white rounded-xl p-4 border border-amber-200 font-mono text-xs space-y-1">
                <p className="text-emerald-700">Mai → Crédit à reporter : 5 000</p>
                <p className="text-slate-400">Juin → Aucune opération → Crédit en attente (non affiché)</p>
                <p className="text-blue-700">Juillet → Opérations → Crédit reporté : 5 000 (utilisé ici)</p>
              </div>
            </div>
          </Box>

          <Box color="border-blue-200 bg-blue-50" icon={<Calendar size={20} className="text-blue-600" />} title="Délai de paiement TVA">
            <Table
              headers={["TVA du mois", "Date limite de paiement"]}
              rows={[
                ["Janvier", "Avant le 28 Février"],
                ["Février", "Avant le 31 Mars"],
                ["Mars", "Avant le 30 Avril"],
                ["... etc", "Dernier jour du mois suivant"],
              ]}
            />
          </Box>

          <Box color="border-violet-200 bg-violet-50" icon={<Search size={20} className="text-violet-600" />} title="Interface mensuelle interactive">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>🗓️ <strong>12 cases mois</strong> avec code couleur : 🔴 TVA à payer / 🟢 Crédit / 🔵 Soldé / ⚪ Aucune op.</li>
              <li>🖱️ <strong>Cliquez sur un mois</strong> pour voir le détail complet</li>
              <li>📋 <strong>Onglet Ventes</strong> : tableau de toutes les ventes du mois avec HT, TVA, TTC</li>
              <li>📋 <strong>Onglet Achats</strong> : tableau de tous les achats du mois avec HT, TVA récup., TTC</li>
              <li>📊 <strong>Tableau annuel</strong> : synthèse des 12 mois en un seul tableau</li>
            </ul>
          </Box>
        </div>
      ),
    },

    // ── 11. Résultats & CA ────────────────────────────────────────────────────
    {
      id: "results", title: "Résultats & Chiffre d'affaires", icon: <TrendingUp size={20} />, color: "green",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">La rubrique Résultats affiche vos indicateurs financiers globaux avec graphiques détaillés.</p>

          <Box color="border-green-200 bg-green-50" icon={<TrendingUp size={20} className="text-green-600" />} title="Indicateurs financiers affichés">
            <Table
              headers={["Indicateur", "Formule"]}
              rows={[
                ["CA Total facturé", "Σ toutes les ventes (montants TTC)"],
                ["CA Encaissé", "Σ montants réellement reçus des clients"],
                ["Total Achats", "Σ tous les achats"],
                ["Achats Payés", "Σ montants réellement versés"],
                ["Bénéfice Brut", "CA Total − Total Achats"],
                ["Marge brute (%)", "Bénéfice Brut / CA Total × 100"],
                ["Créances restantes", "Σ balance clients"],
                ["Dettes restantes", "Σ balance fournisseurs"],
              ]}
            />
          </Box>
        </div>
      ),
    },

    // ── 12. Équipe & Gestion des comptes ─────────────────────────────────────
    {
      id: "team", title: "Équipe & Gestion des comptes", icon: <UserCog size={20} />, color: "indigo",
      content: (
        <div className="space-y-5">
          <Alert type="info">
            La rubrique <strong>Équipe</strong> est accessible depuis le menu principal. Elle affiche la hiérarchie de votre organisation et permet aux admins/managers de gérer les comptes.
          </Alert>

          <Box color="border-indigo-200 bg-indigo-50" icon={<Shield size={20} className="text-indigo-600" />} title="Actions de gestion disponibles">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Lock size={18} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800">🔒 Bloquer un compte</p>
                  <p className="text-amber-700 text-sm">L'utilisateur ne peut plus se connecter. Son compte est désactivé mais les données sont conservées. Réversible.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Unlock size={18} className="text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800">🔓 Débloquer un compte</p>
                  <p className="text-emerald-700 text-sm">Réactive l'accès d'un compte bloqué. L'utilisateur peut se reconnecter normalement.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <Trash2 size={18} className="text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">🗑️ Supprimer un compte</p>
                  <p className="text-red-700 text-sm">Suppression définitive et irréversible. Confirmation requise. Impossible de supprimer le dernier administrateur.</p>
                </div>
              </div>
            </div>
          </Box>

          <Box color="border-slate-200 bg-slate-50" icon={<Shield size={20} className="text-slate-600" />} title="Qui peut gérer qui ?">
            <Table
              headers={["Rôle", "Peut gérer", "Ne peut pas gérer"]}
              rows={[
                [<span className="flex items-center gap-1 text-red-600 font-bold"><Crown size={13} /> Admin</span>, "Managers + Utilisateurs", "Autres Admins / Soi-même"],
                [<span className="flex items-center gap-1 text-amber-600 font-bold"><Briefcase size={13} /> Manager</span>, "Ses Utilisateurs uniquement", "Admins / Managers / Soi-même"],
                [<span className="flex items-center gap-1 text-blue-600 font-bold"><UserIcon size={13} /> Utilisateur</span>, "Personne", "—"],
              ]}
            />
          </Box>

          <Box color="border-blue-200 bg-blue-50" icon={<Ban size={20} className="text-blue-600" />} title="Filtre des membres bloqués">
            <p className="text-sm text-slate-700">Dans la rubrique Équipe, utilisez le filtre <strong>« Bloqués uniquement »</strong> pour voir tous les comptes désactivés. Un point rouge s'affiche sur l'avatar des comptes bloqués.</p>
          </Box>
        </div>
      ),
    },

    // ── 13. Paramètres ────────────────────────────────────────────────────────
    {
      id: "settings", title: "Paramètres", icon: <Settings size={20} />, color: "slate",
      content: (
        <div className="space-y-5">
          <p className="text-slate-700">La rubrique Paramètres regroupe : Profil utilisateur, Devise, Exercices comptables, et Clé d'organisation.</p>

          <Box color="border-slate-200 bg-slate-50" icon={<Globe size={20} className="text-slate-600" />} title="Devise (25 disponibles)">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>🌍 Sélectionnez votre devise parmi 25 options : EUR €, USD $, MAD DH, TND DT, DZD DA, XOF FCFA, GBP £, etc.</li>
              <li>⚡ Le changement est <strong>instantané</strong> sur toutes les pages : ventes, achats, clients, fournisseurs, résultats, stock, TVA</li>
              <li>🔖 La devise active s'affiche dans la barre de navigation en haut</li>
            </ul>
          </Box>

          <Box color="border-blue-200 bg-blue-50" icon={<Calendar size={20} className="text-blue-600" />} title="Exercices comptables">
            <div className="divide-y divide-blue-100">
              <Step n={1} text="Créez un nouvel exercice" sub="Libellé, date début, date fin" />
              <Step n={2} text="Choisissez le statut" sub="Brouillon / Actif / Clôturé" />
              <Step n={3} text="Activez l'exercice" sub="Un seul exercice actif à la fois" />
              <Step n={4} text="L'exercice actif apparaît dans la sidebar et la topbar" />
            </div>
          </Box>

          <Box color="border-violet-200 bg-violet-50" icon={<Key size={20} className="text-violet-600" />} title="Clé d'organisation (Admin uniquement)">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>🔑 Votre clé actuelle est affichée avec un bouton Copier</li>
              <li>🔄 Vous pouvez générer une nouvelle clé <strong>sans limite</strong> (tant que votre licence est valide)</li>
              <li>👥 Liste de tous les membres liés à votre clé</li>
              <li>📋 Guide pas-à-pas pour inviter votre équipe</li>
            </ul>
          </Box>
        </div>
      ),
    },

    // ── 14. Navigation & Astuces ──────────────────────────────────────────────
    {
      id: "tips", title: "Navigation & Astuces", icon: <Star size={20} />, color: "yellow",
      content: (
        <div className="space-y-5">
          <Box color="border-yellow-200 bg-yellow-50" icon={<Star size={20} className="text-yellow-600" />} title="Boutons de défilement">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>⬆️ Bouton <strong>↑</strong> (flottant en bas à droite) — remonter en haut de page instantanément</li>
              <li>⬇️ Bouton <strong>↓</strong> (flottant en bas à droite) — descendre en bas de page instantanément</li>
              <li>📌 Deux petits boutons ↑↓ dans la topbar pour navigation rapide</li>
              <li>Les boutons se désactivent automatiquement quand on est déjà en haut ou en bas</li>
            </ul>
          </Box>

          <Box color="border-emerald-200 bg-emerald-50" icon={<CheckCircle size={20} className="text-emerald-600" />} title="Persistance des données">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>💾 Toutes les données sont sauvegardées automatiquement dans le navigateur (localStorage)</li>
              <li>🔄 Elles persistent même après fermeture et réouverture du navigateur</li>
              <li>👤 La session utilisateur dure 24h — reconnexion automatique sans re-saisir les identifiants</li>
              <li>🔑 Option "Se souvenir de moi" disponible à la connexion</li>
            </ul>
          </Box>

          <Box color="border-blue-200 bg-blue-50" icon={<Info size={20} className="text-blue-600" />} title="Badges de notification">
            <ul className="text-sm text-slate-700 space-y-2">
              <li>🔴 Badge rouge sur <strong>Stock</strong> = nombre de produits en alerte</li>
              <li>🟠 Badge orange sur <strong>Achats</strong> = demandes d'achat en attente d'approbation</li>
              <li>🟣 Badge sur <strong>Équipe</strong> = nombre de subordonnés visibles</li>
            </ul>
          </Box>

          <Alert type="success">
            <strong>Astuce Pro :</strong> Commencez par créer vos produits avec leurs catégories et taux TVA. Ensuite, les formulaires de vente et d'achat seront pré-remplis automatiquement avec tous vos produits.
          </Alert>
        </div>
      ),
    },
  ];

  const colorMap: Record<string, string> = {
    violet: "from-violet-500 to-purple-600",
    red: "from-red-500 to-rose-600",
    blue: "from-blue-500 to-cyan-600",
    orange: "from-orange-500 to-amber-600",
    emerald: "from-emerald-500 to-green-600",
    amber: "from-amber-500 to-yellow-600",
    cyan: "from-cyan-500 to-teal-600",
    green: "from-green-500 to-emerald-600",
    indigo: "from-indigo-500 to-violet-600",
    slate: "from-slate-500 to-gray-600",
    yellow: "from-yellow-500 to-orange-600",
    pink: "from-pink-500 to-rose-600",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Guide d'utilisation</h1>
            <p className="text-violet-200 text-sm">GestioPro — Logiciel de gestion commerciale</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-2xl p-4">
          <p className="text-violet-100 text-sm leading-relaxed">
            Bienvenue dans le guide complet de <strong>GestioPro</strong>, développé par <strong className="text-white">Aboubacar Boubou Keita</strong>.
            Ce guide couvre toutes les fonctionnalités : ventes, achats, clients, fournisseurs, stock, TVA, équipe et paramètres.
          </p>
        </div>
      </div>

      {/* Sommaire rapide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen size={16} className="text-violet-600" /> Sommaire rapide
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setOpenSection(s.id)}
              className={`text-left text-xs px-3 py-2 rounded-xl border transition-all font-medium
                ${openSection === s.id
                  ? "bg-violet-100 border-violet-300 text-violet-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200"}`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sections accordéon */}
      {sections.map((section) => {
        const isOpen = openSection === section.id;
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[section.color] ?? colorMap.violet} flex items-center justify-center text-white shadow-lg`}>
                  {section.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-base text-left">{section.title}</h3>
              </div>
              {isOpen
                ? <ChevronUp size={20} className="text-violet-500 flex-shrink-0" />
                : <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-5 pb-6 border-t border-slate-100">
                <div className="pt-5">{section.content}</div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-center text-white">
        <p className="font-black text-lg mb-1">GestioPro</p>
        <p className="text-slate-400 text-sm">Guide rédigé par <strong className="text-violet-300">Aboubacar Boubou Keita</strong></p>
        <p className="text-slate-500 text-xs mt-2">Logiciel de gestion commerciale et comptable — Version 2025</p>
      </div>
    </div>
  );
}
