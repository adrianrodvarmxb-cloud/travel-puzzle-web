/**
 * REQ-059: "Cómo funciona tu reserva" para viajes bajo solicitud, al estilo de Viator/Civitatis.
 * El texto solo promete lo que existe: sin retención en tarjeta (hoy) o con ella cuando STRIPE_HOLD_ENABLED="true". Puro.
 */
type Steps = { title: string; steps: [string, string, string, string]; formTitle: string; formNote: string };
type Lang = "es" | "en" | "pt" | "de" | "fr" | "it";

const LINK: Record<Lang, Steps> = {
  es: { title: "Cómo funciona tu reserva", formTitle: "Solicita tu reserva", formNote: "No te cobramos nada hasta confirmar.", steps: [
    "Envías tu solicitud. No te cobramos nada en este paso.",
    "Confirmamos la disponibilidad con el operador local en un máximo de 48 horas hábiles.",
    "Si hay lugar, te enviamos un enlace de pago seguro (Stripe). Tu lugar queda reservado al pagar.",
    "Si no hay lugar, te avisamos y no pagas nada."] },
  en: { title: "How your booking works", formTitle: "Request your booking", formNote: "You won't be charged until we confirm.", steps: [
    "Send your request. You won't be charged at this step.",
    "We confirm availability with the local operator within 48 business hours.",
    "If there's space, we send you a secure payment link (Stripe). Your spot is booked once you pay.",
    "If there's no space, we let you know and you pay nothing."] },
  pt: { title: "Como funciona sua reserva", formTitle: "Solicite sua reserva", formNote: "Não cobramos nada até confirmar.", steps: [
    "Você envia sua solicitação. Não cobramos nada nesta etapa.",
    "Confirmamos a disponibilidade com o operador local em até 48 horas úteis.",
    "Se houver vaga, enviamos um link de pagamento seguro (Stripe). Sua vaga fica reservada ao pagar.",
    "Se não houver vaga, avisamos e você não paga nada."] },
  de: { title: "So funktioniert deine Buchung", formTitle: "Buchung anfragen", formNote: "Wir belasten nichts, bis wir bestätigen.", steps: [
    "Du sendest deine Anfrage. In diesem Schritt wird nichts belastet.",
    "Wir bestätigen die Verfügbarkeit mit dem lokalen Veranstalter innerhalb von 48 Werktagsstunden.",
    "Ist ein Platz frei, senden wir dir einen sicheren Zahlungslink (Stripe). Mit der Zahlung ist dein Platz gebucht.",
    "Ist kein Platz frei, informieren wir dich und du zahlst nichts."] },
  fr: { title: "Comment fonctionne votre réservation", formTitle: "Demandez votre réservation", formNote: "Aucun débit avant notre confirmation.", steps: [
    "Vous envoyez votre demande. Aucun débit à cette étape.",
    "Nous confirmons la disponibilité avec l'opérateur local sous 48 heures ouvrées.",
    "S'il y a de la place, nous vous envoyons un lien de paiement sécurisé (Stripe). Votre place est réservée au paiement.",
    "S'il n'y a pas de place, nous vous prévenons et vous ne payez rien."] },
  it: { title: "Come funziona la tua prenotazione", formTitle: "Richiedi la tua prenotazione", formNote: "Non addebitiamo nulla fino alla conferma.", steps: [
    "Invii la tua richiesta. In questa fase non addebitiamo nulla.",
    "Confermiamo la disponibilità con l'operatore locale entro 48 ore lavorative.",
    "Se c'è posto, ti inviamo un link di pagamento sicuro (Stripe). Il posto è prenotato al pagamento.",
    "Se non c'è posto, ti avvisiamo e non paghi nulla."] },
};

const HOLD: Record<Lang, Steps> = {
  es: { title: "Cómo funciona tu reserva", formTitle: "Solicita tu reserva", formNote: "Solo retenemos el importe; se cobra al confirmar.", steps: [
    "Envías tu solicitud con tu tarjeta. Retenemos el importe en tu tarjeta: no es un cobro.",
    "Confirmamos la disponibilidad con el operador local en un máximo de 48 horas hábiles.",
    "Si hay lugar, se cobra el importe retenido y te enviamos tu confirmación.",
    "Si no hay lugar, liberamos la retención por el mismo medio de pago; tu banco puede tardar unos días en reflejarlo."] },
  en: { title: "How your booking works", formTitle: "Request your booking", formNote: "We only hold the amount; you're charged when we confirm.", steps: [
    "Send your request with your card. We place a hold on your card — it's not a charge.",
    "We confirm availability with the local operator within 48 business hours.",
    "If there's space, the held amount is charged and we send your confirmation.",
    "If there's no space, we release the hold on the same payment method; your bank may take a few days to show it."] },
  pt: { title: "Como funciona sua reserva", formTitle: "Solicite sua reserva", formNote: "Só retemos o valor; a cobrança ocorre ao confirmar.", steps: [
    "Você envia sua solicitação com seu cartão. Retemos o valor no cartão: não é uma cobrança.",
    "Confirmamos a disponibilidade com o operador local em até 48 horas úteis.",
    "Se houver vaga, o valor retido é cobrado e enviamos sua confirmação.",
    "Se não houver vaga, liberamos a retenção no mesmo meio de pagamento; seu banco pode levar alguns dias para mostrar."] },
  de: { title: "So funktioniert deine Buchung", formTitle: "Buchung anfragen", formNote: "Wir reservieren den Betrag nur; belastet wird bei Bestätigung.", steps: [
    "Du sendest deine Anfrage mit deiner Karte. Wir reservieren den Betrag auf deiner Karte — das ist keine Belastung.",
    "Wir bestätigen die Verfügbarkeit mit dem lokalen Veranstalter innerhalb von 48 Werktagsstunden.",
    "Ist ein Platz frei, wird der reservierte Betrag belastet und du erhältst deine Bestätigung.",
    "Ist kein Platz frei, geben wir die Reservierung über dasselbe Zahlungsmittel frei; deine Bank kann einige Tage brauchen."] },
  fr: { title: "Comment fonctionne votre réservation", formTitle: "Demandez votre réservation", formNote: "Nous bloquons seulement le montant ; le débit a lieu à la confirmation.", steps: [
    "Vous envoyez votre demande avec votre carte. Nous bloquons le montant sur votre carte : ce n'est pas un débit.",
    "Nous confirmons la disponibilité avec l'opérateur local sous 48 heures ouvrées.",
    "S'il y a de la place, le montant bloqué est débité et nous vous envoyons la confirmation.",
    "S'il n'y a pas de place, nous libérons le blocage sur le même moyen de paiement ; votre banque peut mettre quelques jours à l'afficher."] },
  it: { title: "Come funziona la tua prenotazione", formTitle: "Richiedi la tua prenotazione", formNote: "Blocchiamo solo l'importo; l'addebito avviene alla conferma.", steps: [
    "Invii la richiesta con la tua carta. Blocchiamo l'importo sulla carta: non è un addebito.",
    "Confermiamo la disponibilità con l'operatore locale entro 48 ore lavorative.",
    "Se c'è posto, l'importo bloccato viene addebitato e ti inviamo la conferma.",
    "Se non c'è posto, sblocchiamo l'importo sullo stesso metodo di pagamento; la banca può impiegare alcuni giorni."] },
};

// REQ-059
export function bookingSteps(lang: string, o: { cardHold: boolean }): Steps {
  const set = o.cardHold ? HOLD : LINK;
  return set[(lang in set ? lang : "en") as Lang];
}

/** Interruptor STRIPE_HOLD_ENABLED: solo "true" cuando el cobro con retención exista en producción. */
export const isCardHoldEnabled = (v: string | undefined) => v === "true";
