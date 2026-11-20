"use strict";
// Serveur d'achats de XIDATA XOORE (Firebase Cloud Functions)
//  - createCheckoutSession : crée la page de paiement Stripe pour un lot de cauris
//  - stripeWebhook         : reçoit la confirmation de paiement de Stripe et crédite le joueur
//  - spendPurchased        : dépense des cauris achetés
// Les clés secrètes viennent du fichier functions/.env, écrit par le workflow GitHub.

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { packOf, creditOrder, spendFromWallet, safeReturnUrl } = require("./wallet");

admin.initializeApp({
  databaseURL: "https://xidata-strategie-f598a-default-rtdb.europe-west1.firebasedatabase.app"
});

const REGION = "europe-west1";
const db = () => admin.database();

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpsError("failed-precondition", "Paiement non configuré.");
  return new Stripe(key);
}

exports.createCheckoutSession = onCall({ region: REGION }, async request => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Connexion requise.");

  // Un compte Google est obligatoire : sinon les achats se perdraient en changeant de téléphone
  const provider = auth.token && auth.token.firebase && auth.token.firebase.sign_in_provider;
  if (provider === "anonymous") {
    throw new HttpsError("failed-precondition", "Connecte-toi avec Google avant d'acheter.");
  }

  const packId = request.data && request.data.packId;
  const pack = packOf(packId);
  if (!pack) throw new HttpsError("invalid-argument", "Lot inconnu.");

  const site = process.env.SITE_URL || "";
  const base = safeReturnUrl(request.data && request.data.returnUrl, site);
  if (!base) throw new HttpsError("failed-precondition", "Adresse du site non configurée.");

  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: pack.cents,
        product_data: { name: pack.name + " (" + pack.amount + " cauris)" }
      }
    }],
    client_reference_id: auth.uid,
    metadata: { uid: auth.uid, packId },
    success_url: base + "?achat=ok",
    cancel_url: base + "?achat=annule"
  });

  return { url: session.url };
});

exports.stripeWebhook = onRequest({ region: REGION }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST seulement");
    return;
  }

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      req.rawBody,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Signature Stripe invalide :", error.message);
    res.status(400).send("Signature invalide");
    return;
  }

  const paidTypes = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
  if (paidTypes.includes(event.type)) {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const uid = session.client_reference_id || (session.metadata && session.metadata.uid);
      const packId = session.metadata && session.metadata.packId;
      const pack = packOf(packId);

      // Contrôle : le montant payé doit être celui du lot
      if (!pack || session.amount_total !== pack.cents || session.currency !== "eur") {
        console.error("Paiement ignoré (montant ou lot inattendu) :", session.id);
        res.status(200).send("ignoré");
        return;
      }

      try {
        const result = await creditOrder(db(), uid, session.id, packId);
        console.log("Commande", session.id, result.credited ? "créditée" : "déjà traitée");
      } catch (error) {
        console.error("Crédit impossible :", error.message);
        res.status(500).send("Erreur"); // Stripe réessaiera plus tard
        return;
      }
    }
  }

  res.status(200).send("ok");
});

exports.spendPurchased = onCall({ region: REGION }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
  try {
    return await spendFromWallet(db(), request.auth.uid, request.data && request.data.amount);
  } catch (error) {
    throw new HttpsError("invalid-argument", "Montant invalide.");
  }
});
