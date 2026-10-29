import { TourAPI } from '@/types';

/**
 * Mock Tours Data - Based on Real API Response
 * These tours are from the actual API we'll be integrating with
 */
export const mockToursAPI: TourAPI[] = [
  {
    id: 52566,
    updatedAt: "2025-10-24 00:04:36",
    title: {
      en: "Discover Mazatlán by Pulmonia",
      es: "Descubre Mazatlán de la mano de Pulmonia",
      pt: "Descobrir Mazatlán com a Pulmonia",
      de: "Entdecken Sie Mazatlán mit Pulmonia",
      fr: "Découvrir Mazatlán par Pulmonia",
      it: "Scoprire Mazatlán con Pulmonia"
    },
    brief: {
      de: "Erkunden Sie mit uns Mazatlán auf einer spannenden Pulmonia-Stadtrundfahrt. Entdecken Sie ikonische Orte und tauchen Sie ein in die Geschichte und Traditionen dieser Perle des mexikanischen Pazifiks. Lassen Sie uns gemeinsam fahren und lernen.",
      en: "Join us to explore Mazatlán on a thrilling Pulmonia city tour. Discover iconic spots and immerse yourself in the history and traditions of this gem of the Mexican Pacific. Let's ride and learn together.",
      es: "Acompáñenos a explorar Mazatlán en un emocionante recorrido por la ciudad en Pulmonia. Descubra lugares emblemáticos y sumérjase en la historia y las tradiciones de esta joya del Pacífico mexicano. Viajemos y aprendamos juntos.",
      fr: "Rejoignez-nous pour explorer Mazatlán lors d'une visite guidée passionnante de la ville avec Pulmonia. Découvrez des lieux emblématiques et plongez dans l'histoire et les traditions de ce joyau du Pacifique mexicain. Roulons et apprenons ensemble.",
      it: "Unitevi a noi per esplorare Mazatlán in un emozionante tour della città di Pulmonia. Scoprite i luoghi simbolo e immergetevi nella storia e nelle tradizioni di questo gioiello del Pacifico messicano. Pedaliamo e impariamo insieme.",
      pt: "Junte-se a nós para explorar Mazatlán num emocionante passeio pela cidade de Pulmonia. Descubra locais emblemáticos e mergulhe na história e nas tradições desta joia do Pacífico mexicano. Vamos passear e aprender juntos."
    },
    description: {
      de: "- Beginnen Sie Ihr Abenteuer mit der Abholung direkt an Ihrer Unterkunft und steigen Sie in eine pulmonía, die berühmten offenen Autos von Mazatlán.\r\n\r\n- Fahren Sie entlang des Malecón, einer der längsten Strandpromenaden Mexikos, und genießen Sie die atemberaubende Aussicht auf die Küste.\r\n\r\n- Halten Sie an ikonischen Wahrzeichen entlang des Malecón, wie dem Mazatlán-Schild, dem Baseball-Denkmal, dem Pulmonía-Denkmal und vielem mehr.\r\n\r\n- Tauchen Sie ein in das Herz der Kultur von Mazatlán mit einem Besuch des Hauptmarktes, wo Sie die lebhaften Aromen der Stadt kosten können.\r\n\r\n- Erkunden Sie die Pracht der Kathedrale, ein Symbol für die reiche Geschichte und architektonische Schönheit Mazatláns.\r\n\r\n- Entdecken Sie die Geschichten der berühmten Musiker von Mazatlán und tauchen Sie ein in den Rhythmus der Stadt.\r\n\r\n- Genießen Sie den atemberaubenden Panoramablick von den berühmtesten Aussichtspunkten Mazatláns.\r\n\r\n- Lernen Sie die unbesungenen Helden kennen, die Mazatlán vor Hurrikans schützen, und erfahren Sie mehr über ihre wichtige Rolle beim Schutz der Stadt.\r\n\r\n- Entdecken Sie die Geheimnisse des höchsten natürlichen Leuchtturms von Mazatlán und die reiche Vielfalt der Flora und Fauna, die dieses Paradies ihr Zuhause nennen.\r\n\r\n- Sie können gerne Ihre eigenen Getränke mitbringen, um an der Tour teilzunehmen. Ja, Alkohol ist erlaubt!",
      en: "- Start your adventure with a pick-up right at your accommodation, hopping aboard a pulmonía, the famous open-air cars of Mazatlán.\r\n\r\n- Cruise along the Malecón, one of the longest seaside promenades in Mexico, soaking in the stunning coastal views.\r\n\r\n- Make stops at iconic landmarks along the Malecón, including the Mazatlán sign, the baseball monument, the pulmonía monument, and more.\r\n\r\n- Dive into the heart of Mazatlán's culture with a visit to the main market, where you can taste the vibrant flavors of the city.\r\n\r\n- Explore the grandeur of the cathedral, a symbol of Mazatlán's rich history and architectural beauty.\r\n\r\n- Discover the stories behind Mazatlán's famous musicians, immersing yourself in the rhythm of the city.\r\n\r\n- Take in breathtaking panoramic views from the most iconic overlooks in Mazatlán.\r\n\r\n- Meet the unsung heroes who protect Mazatlán from hurricanes, learning about their vital role in safeguarding the city.\r\n\r\n- Uncover the secrets of Mazatlán's highest natural lighthouse and the rich diversity of flora and fauna that call this paradise home.\r\n\r\n- Feel free to bring your own beverages along for the ride. Yes, alcohol is allowed!",
      es: "- Comience su aventura con una recogida justo en su alojamiento, subiendo a bordo de una pulmonía, los famosos coches al aire libre de Mazatlán.\r\n\r\n- Recorra el Malecón, uno de los paseos marítimos más largos de México, y disfrute de las impresionantes vistas de la costa.\r\n\r\n- Haga paradas en lugares emblemáticos del Malecón, como el letrero de Mazatlán, el monumento al béisbol y el monumento a la pulmonía, entre otros.\r\n\r\n- Sumérjase en el corazón de la cultura de Mazatlán con una visita al mercado principal, donde podrá degustar los vibrantes sabores de la ciudad.\r\n\r\n- Explore la grandeza de la catedral, símbolo de la rica historia y belleza arquitectónica de Mazatlán.\r\n\r\n- Descubra las historias de los famosos músicos de Mazatlán y sumérjase en el ritmo de la ciudad.\r\n\r\n- Disfrute de impresionantes vistas panorámicas desde los miradores más emblemáticos de Mazatlán.\r\n\r\n- Conoce a los héroes anónimos que protegen Mazatlán de los huracanes, aprendiendo sobre su papel vital en la salvaguarda de la ciudad.\r\n\r\n- Descubre los secretos del faro natural más alto de Mazatlán y la rica diversidad de flora y fauna que habitan este paraíso.\r\n\r\n- Siéntase libre de traer sus propias bebidas para el paseo. Sí, ¡el alcohol está permitido!",
      fr: "- Commencez votre aventure par une prise en charge à votre hébergement et montez à bord d'une pulmonía, les célèbres voitures à ciel ouvert de Mazatlán.\r\n\r\n- Faites une croisière sur le Malecón, l'une des plus longues promenades en bord de mer du Mexique, et admirez les superbes vues sur la côte.\r\n\r\n- Faites des arrêts aux monuments emblématiques du Malecón, notamment l'enseigne de Mazatlán, le monument au baseball, le monument à la pulmonía, et bien d'autres encore.\r\n\r\n- Plongez au cœur de la culture de Mazatlán en visitant le marché principal, où vous pourrez goûter aux saveurs vibrantes de la ville.\r\n\r\n- Explorez la grandeur de la cathédrale, symbole de la riche histoire et de la beauté architecturale de Mazatlán.\r\n\r\n- Découvrez l'histoire des célèbres musiciens de Mazatlán et plongez-vous dans le rythme de la ville.\r\n\r\n- Admirez des vues panoramiques à couper le souffle depuis les points de vue les plus emblématiques de Mazatlán.\r\n\r\n- Rencontrez les héros méconnus qui protègent Mazatlán des ouragans et découvrez leur rôle vital dans la sauvegarde de la ville.\r\n\r\n- Découvrez les secrets du plus haut phare naturel de Mazatlán et la riche diversité de la flore et de la faune qui habitent ce paradis.\r\n\r\n- N'hésitez pas à apporter vos propres boissons pour la balade. Oui, l'alcool est autorisé !",
      it: "- Iniziate la vostra avventura con un prelievo direttamente al vostro alloggio, salendo a bordo di una pulmonía, le famose auto a cielo aperto di Mazatlán.\r\n\r\n- Navigate lungo il Malecón, una delle più lunghe passeggiate sul mare del Messico, ammirando le splendide viste sulla costa.\r\n\r\n- Fermatevi presso i luoghi simbolo del Malecón, come l'insegna di Mazatlán, il monumento al baseball, il monumento alla pulmonía e altri ancora.\r\n\r\n- Immergetevi nel cuore della cultura di Mazatlán con una visita al mercato principale, dove potrete assaggiare i vibranti sapori della città.\r\n\r\n- Esplorate la grandezza della cattedrale, simbolo della ricca storia e della bellezza architettonica di Mazatlán.\r\n\r\n- Scoprite le storie dei famosi musicisti di Mazatlán, immergendovi nel ritmo della città.\r\n\r\n- Ammirate le viste panoramiche mozzafiato dai punti più iconici di Mazatlán.\r\n\r\n- Incontrate gli eroi non celebrati che proteggono Mazatlán dagli uragani e scoprite il loro ruolo vitale nella salvaguardia della città.\r\n\r\n- Scoprite i segreti del faro naturale più alto di Mazatlán e la ricca diversità della flora e della fauna che abitano questo paradiso.\r\n\r\n- Sentitevi liberi di portare con voi le vostre bevande. Sì, gli alcolici sono ammessi!",
      pt: "- Comece a sua aventura com um serviço de recolha no seu alojamento, subindo a bordo de uma pulmonía, os famosos carros ao ar livre de Mazatlán.\r\n\r\n- Faça um cruzeiro ao longo do Malecón, um dos mais longos passeios à beira-mar no México, absorvendo as deslumbrantes vistas costeiras.\r\n\r\n- Faça paragens em marcos icónicos ao longo do Malecón, incluindo o sinal de Mazatlán, o monumento do basebol, o monumento da pulmonía e muito mais.\r\n\r\n- Mergulhe no coração da cultura de Mazatlán com uma visita ao mercado principal, onde poderá provar os sabores vibrantes da cidade.\r\n\r\n- Explore a grandeza da catedral, um símbolo da rica história e beleza arquitetónica de Mazatlán.\r\n\r\n- Descubra as histórias por detrás dos famosos músicos de Mazatlán, mergulhando no ritmo da cidade.\r\n\r\n- Desfrute de vistas panorâmicas de cortar a respiração nos miradouros mais emblemáticos de Mazatlán.\r\n\r\n- Conheça os heróis desconhecidos que protegem Mazatlán dos furacões, aprendendo sobre o seu papel vital na salvaguarda da cidade.\r\n\r\n- Descubra os segredos do farol natural mais alto de Mazatlán e a rica diversidade de flora e fauna que chamam este paraíso de lar.\r\n\r\n- Sinta-se à vontade para trazer as suas próprias bebidas para o passeio. Sim, o álcool é permitido!"
    },
    providerTitle: "MVP Experiences",
    providerPhone: "6699334557",
    URL: "https://www.freetour.com/mazatlan/discover-mazatlan-pulmonia",
    URLs: {
      en: "https://www.freetour.com/mazatlan/discover-mazatlan-pulmonia",
      es: "https://www.freetour.com/es/mazatlan/descubre-mazatlan-pulmonia",
      pt: "https://www.freetour.com/pt/mazatlan/descobrir-mazatlan-pulmonia",
      de: "https://www.freetour.com/de/mazatlan/entdecken-mazatlan-pulmonia",
      fr: "https://www.freetour.com/fr/mazatlan/decouvrir-mazatlan-pulmonia",
      it: "https://www.freetour.com/it/mazatlan/scoprire-mazatlan-pulmonia"
    },
    price: {
      value: 100,
      currency: "EUR"
    },
    length: "4:00",
    meetingPoint: {
      title: "Mazatlán Downtown",
      coordinates: "23.201165,-106.4203342",
      googlePlaceId: "ChIJ-VgaApdTn4YRj5zFBZBfT2k"
    },
    cityId: 2935,
    countryId: 99,
    includes: [
      "Angela Peralta museum fee",
      "Water bottles",
      "Ice cream taste"
    ],
    POIs: null,
    titleImageURL: "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-03.jpg",
    categoryId: 9,
    images: [
      {
        "id": 179708,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-03.jpg"
      },
      {
        "id": 179710,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-05.jpg"
      },
      {
        "id": 179711,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-06.jpg"
      },
      {
        "id": 179712,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-07.jpg"
      },
      {
        "id": 179713,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-08.jpg"
      },
      {
        "id": 179714,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-09.jpg"
      },
      {
        "id": 179715,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-10.jpg"
      },
      {
        "id": 179716,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-11.jpg"
      },
      {
        "id": 179717,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-12.jpg"
      },
      {
        "id": 179719,
        "URL": "https://www.freetour.com/images/tours/52566/discover-mazatlan-by-pulmonia-14.jpg"
      }
    ],
    videoURL: null,
    rating: null,
    reviewsNumber: 0
  },
  {
    id: 54813,
    updatedAt: "2025-10-24 03:32:15",
    title: {
      en: "Creative Free Tour in Mazatlan",
      es: "Free Tour Creativo en Mazatlan",
      pt: "Excursão livre criativa em Mazatlán",
      de: "Kreative kostenlose Tour in Mazatlan",
      fr: "Visite libre créative à Mazatlan",
      it: "Tour creativo gratuito a Mazatlan"
    },
    brief: {
      de: "Entdecken Sie die Verschmelzung von Natur und Inspiration. Nehmen Sie teil, um zu erforschen, sich inspirieren zu lassen und neue Erfahrungen zu machen, die die Schönheit der Natur mit menschlicher Kreativität verbinden.",
      en: "Discover the fusion of nature and inspiration. Join us to explore, be inspired and create in enriching experiences that combine natural beauty with human creativity.",
      es: "Descubre la fusión entre naturaleza e inspiración. Únete para explorar, inspirarte y crear en experiencias enriquecedoras que combinan la belleza natural con la creatividad humana.",
      fr: "Découvrez la fusion de la nature et de l'inspiration. Rejoignez-nous pour explorer, être inspiré et créer des expériences enrichissantes qui combinent la beauté naturelle et la créativité humaine.",
      it: "Scoprite la fusione di natura e ispirazione. Unitevi all'esplorazione, all'ispirazione e alla creazione di esperienze arricchenti che combinano la bellezza naturale con la creatività umana.",
      pt: "Descubra a fusão entre a natureza e a inspiração. Junte-se a nós para explorar, inspirar-se e criar em experiências enriquecedoras que combinam a beleza natural com a criatividade humana."
    },
    description: {
      de: "Diese Begegnungen im Freien bieten uns ein Umfeld, das zur Erforschung, zum kreativen Ausdruck und zur Verbindung mit unserer Umwelt einlädt. \r\n\r\nWährend dieser Begegnungen haben wir die Möglichkeit, in die Schönheit und Stille der Natur einzutauchen, die unsere Sinne anregt, unseren Geist beruhigt und das kreative Wesen, das wir alle sind, freisetzt. \r\n\r\nWir werden uns an Aktivitäten beteiligen, die die Fantasie anregen sollen: kurze Spaziergänge, Beobachtung von Flora und Fauna, nachhaltige Kunstsessions, geführte Meditationen, kreative Fotografie, einschließlich Lightpainting und ein Picknick. \r\n\r\nDie Kombination aus Ruhe und kreativer Anregung fördert ein Umfeld der Zusammenarbeit, des Ideenaustauschs und der individuellen Erkundung in der Gruppe. \r\n\r\nDiese Momente bieten nicht nur Raum für Kreativität, sondern fördern auch das Gefühl der Verbundenheit mit der Natur, das Umweltbewusstsein und die Sorge um die Umwelt. Am Ende werden wir neue Ideen, klarere Perspektiven und ein Gefühl der Erneuerung und Verbundenheit mit unserer Umgebung mitnehmen.",
      en: "These outdoor gatherings offer us an environment conducive to exploration, creative expression and connection with our environment. \r\n\r\nDuring these encounters, we have the opportunity to immerse ourselves in the beauty and tranquility of nature; which stimulates the senses, calms the mind and unleashes the creative being that we all are. \r\n\r\nWe will engage in activities designed to inspire the imagination, in short walks, flora and fauna observation, sustainable art sessions, guided meditations, creative photography, including lighpainting and a picnic. \r\n\r\nThe combination of serenity and creative stimulation fosters an environment of collaboration, exchange of ideas and individual/group exploration. \r\n\r\nThese moments not only provide a space for creativity, but also foster a sense of connection with nature, promote environmental awareness and care for the environment. At the end we will take away new ideas, clearer perspectives and a sense of renewal-connection with our surroundings.",
      es: "Estos encuentros al aire libre nos ofrece un ambiente propicio para la exploración, la expresión creativa y la conexión con nuestro ambiente. \r\n\r\nDurante estos encuentros, tenemos la oportunidad de sumergirnos en la belleza y la tranquilidad de la naturaleza; lo que estimula los sentidos, calma la mente y desata el ser creativo que somos todos. \r\n\r\nRealizaremos actividades diseñadas para inspirar la imaginación, en pequeñas caminatas, observación en la flora y fauna, sesiones artísticas sustentables, meditaciones guiadas, fotografía creativa, incluyendo lighpainting y un pícnic. \r\n\r\nLa combinación de la serenidad y la estimulación creativa fomenta un ambiente de colaboración, intercambio de ideas y exploración individual/grupal. \r\n\r\nEstos momentos no solo proporcionan un espacio para la creatividad, sino que también fomentan un sentido de conexión con la naturaleza, promueven la conciencia ambiental y el cuidado del medio ambiente. Al finalizar llevaremos nuevas ideas, perspectivas más claras y una sensación de renovación-conexión con lo que nos rodea.",
      fr: "Ces rencontres en plein air nous offrent un environnement propice à l'exploration, à l'expression créative et à la connexion avec notre environnement. \r\n\r\nAu cours de ces rencontres, nous avons l'occasion de nous immerger dans la beauté et la tranquillité de la nature, ce qui stimule les sens, calme l'esprit et libère l'être créatif que nous sommes tous. \r\n\r\nNous nous engagerons dans des activités conçues pour inspirer l'imagination : courtes promenades, observation de la flore et de la faune, séances d'art durable, méditations guidées, photographie créative, y compris la peinture à la lumière et un pique-nique. \r\n\r\nLa combinaison de la sérénité et de la stimulation créative favorise un environnement de collaboration, d'échange d'idées et d'exploration individuelle ou en groupe. \r\n\r\nCes moments n'offrent pas seulement un espace de créativité, mais favorisent également un sentiment de connexion avec la nature, promeuvent la conscience environnementale et le respect de l'environnement. À la fin, nous repartirons avec de nouvelles idées, des perspectives plus claires et un sentiment de renouveau et de connexion avec notre environnement.",
      it: "Questi incontri all'aperto ci offrono un ambiente favorevole all'esplorazione, all'espressione creativa e alla connessione con il nostro ambiente. \r\n\r\nDurante questi incontri abbiamo l'opportunità di immergerci nella bellezza e nella tranquillità della natura, che stimola i sensi, calma la mente e libera l'essere creativo che siamo. \r\n\r\nCi dedicheremo ad attività progettate per ispirare l'immaginazione, a brevi passeggiate, all'osservazione della flora e della fauna, a sessioni di arte sostenibile, a meditazioni guidate, alla fotografia creativa, compreso il lighpainting e a un picnic. \r\n\r\nLa combinazione di serenità e stimoli creativi favorisce un ambiente di collaborazione, scambio di idee ed esplorazione individuale e di gruppo. \r\n\r\nQuesti momenti non solo offrono uno spazio per la creatività, ma favoriscono anche un senso di connessione con la natura, promuovono la consapevolezza ambientale e la cura dell'ambiente. Alla fine porteremo con noi nuove idee, prospettive più chiare e un senso di rinnovamento e connessione con l'ambiente circostante.",
      pt: "Estes encontros ao ar livre oferecem-nos um ambiente propício à exploração, à expressão criativa e à ligação com o nosso ambiente. \r\n\r\nDurante estes encontros, temos a oportunidade de mergulhar na beleza e tranquilidade da natureza, que estimula os sentidos, acalma a mente e liberta o ser criativo que todos nós somos. \r\n\r\nVamos participar em actividades destinadas a inspirar a imaginação, em pequenas caminhadas, observação de flora e fauna, sessões de arte sustentável, meditações guiadas, fotografia criativa, incluindo lighpainting e um piquenique. \r\n\r\nA combinação de serenidade e estímulo criativo promove um ambiente de colaboração, troca de ideias e exploração individual/grupal. \r\n\r\nEstes momentos não só proporcionam um espaço para a criatividade, como também fomentam um sentido de ligação com a natureza, promovem a consciencialização ambiental e o cuidado com o ambiente. No final, levaremos novas ideias, perspectivas mais claras e uma sensação de renovação - ligação com o que nos rodeia."
    },
    providerTitle: "Shareni Trejo",
    providerPhone: "5627156545",
    URL: "https://www.freetour.com/mazatlan/creative-free-tour",
    URLs: {
      en: "https://www.freetour.com/mazatlan/creative-free-tour",
      es: "https://www.freetour.com/es/mazatlan/free-tour-creativo",
      pt: "https://www.freetour.com/pt/mazatlan/excursao-livre-criativa",
      de: "https://www.freetour.com/de/mazatlan/kreative-kostenlose-tour",
      fr: "https://www.freetour.com/fr/mazatlan/visite-libre-creative",
      it: "https://www.freetour.com/it/mazatlan/tour-creativo-gratuito"
    },
    price: {
      value: 0,
      currency: "EUR"
    },
    length: "2:45",
    meetingPoint: {
      title: "Playa gaviotas",
      coordinates: "23.240896413114662,-106.4509704621533",
      googlePlaceId: "ChIJo373p1urmIYRO60f7_D1dDE"
    },
    cityId: 2935,
    countryId: 99,
    includes: [
      "Playa Gaviotas mzt",
      "Photo package",
      "Snack"
    ],
    POIs: [
      {
        id: 21590,
        title: "Playa Gaviotas mzt",
        googlePlaceId: "ChIJTRIv0aJUn4YRUjUANaqB9PI"
      }
    ],
    titleImageURL: "https://www.freetour.com/images/tours/54813/encuentro-creativo-en-mazatlan-02.jpg",
    categoryId: 6,
    images: [
      {
        "id": 188621,
        "URL": "https://www.freetour.com/images/tours/54813/encuentro-creativo-en-mazatlan-02.jpg"
      },
      {
        "id": 188295,
        "URL": "https://www.freetour.com/images/tours/54813/encuentros-creativos-2-01.jpg"
      },
      {
        "id": 188620,
        "URL": "https://www.freetour.com/images/tours/54813/encuentro-creativo-en-mazatlan-01.jpg"
      }
    ],
    videoURL: null,
    rating: null,
    reviewsNumber: 0
  }
];

/**
 * Helper function to convert API tour to UI-friendly format
 * @param apiTour - Tour from API
 * @param language - Current language (default: 'en')
 */
export function convertAPITourToTour(apiTour: TourAPI, language: 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' = 'en') {
  // Handle null/undefined images array
  const additionalImages = apiTour.images?.map(img => img.URL) || [];
  
  // Build images array, only including titleImageURL if it exists
  const images = apiTour.titleImageURL 
    ? [apiTour.titleImageURL, ...additionalImages.filter(img => img !== apiTour.titleImageURL)]
    : additionalImages;
  
  return {
    id: `tour-${apiTour.id}`,
    externalId: apiTour.id,
    title: apiTour.title[language] || '',
    brief: apiTour.brief[language] || null,
    description: apiTour.description[language] || null,
    destination: apiTour.meetingPoint.title,
    provider: apiTour.providerTitle,
    providerPhone: apiTour.providerPhone,
    price: apiTour.price.value,
    currency: apiTour.price.currency,
    images,
    titleImageURL: apiTour.titleImageURL,
    duration: apiTour.length,
    meetingPoint: apiTour.meetingPoint,
    includes: apiTour.includes,
    rating: apiTour.rating,
    reviewsNumber: apiTour.reviewsNumber,
    bookingURL: apiTour.URLs[language],
    isActive: true,

    // Keep multilang data for language switching
    _multilang: {
      title: apiTour.title,
      brief: apiTour.brief,
      description: apiTour.description,
      URLs: apiTour.URLs,
    }
  };
}

/**
 * Get all tours in current language
 */
export function getMockTours(language: 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' = 'en') {
  return mockToursAPI.map(tour => convertAPITourToTour(tour, language));
}

/**
 * Get single tour by ID in current language
 */
export function getMockTourById(id: number, language: 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' = 'en') {
  const apiTour = mockToursAPI.find(tour => tour.id === id);
  return apiTour ? convertAPITourToTour(apiTour, language) : null;
}

