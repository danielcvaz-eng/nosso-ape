const produtos = [
  {
    id: 1,
    nome: "Lava e seca Electrolux Inverter 12kg LFC12",
    categoria: "Lavanderia",
    preco: 3019.00,
    prioridade: "alta",
    tipo: "colaborativo",
    descricao: "Item essencial para a rotina da casa.",
    link: "https://www.magazineluiza.com.br/lavadora-de-roupas-electrolux-inverter-12kg-cesto-inox-8-programas-de-lavagem-agua-quente-cinza-onix-lfc12/p/241186800/ed/ela1/?seller_id=magazineluiza",
    status: "disponivel"
  },
  {
    id: 2,
    nome: "Micro-ondas de Bancada Electrolux Efficient 36L ME36S - 220V Prata",
    categoria: "Cozinha",
    preco: 793.12,
    prioridade: "alta",
    tipo: "colaborativo",
    descricao: "Micro-ondas grande e eficiente para o uso diário da casa, com capacidade de 36L.",
    link: "https://a.co/d/0hMQB6eW",
    status: "disponivel"
  },
  {
    id: 3,
    nome: "Almofadas decorativas cheias com zíper invisível",
    categoria: "Sala / Decoração",
    preco: 130.00,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Conjunto de almofadas decorativas cheias, em tons terrosos e claros, para deixar a sala mais confortável e bonita.",
    link: "https://www.amazon.com.br/Almofadas-Decorativas-Cheias-Invis%C3%ADvel-Diversas/dp/B0GMJFRYYC/ref=sr_1_26?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=2DNWHKIITJH9S&dib=eyJ2IjoiMSJ9.xP1S6v7-jAyX3W3wMyg-QG_xruK0bUN40EWbmXC1jfemnBKmsnecVmajDuQbpLzypUcq0-tiO-CR2iSbM0XX_iLWKa7nzTNdO2buRrIQbV8nolCuBjl4eGphrQWNE7QPbFxIqRyM8ekAi-bMuM0NPmbhjX_hrdhzVTAVx-sxK49qIL3AHrONn4F_l2xPdS1UZJbvEq1R5EI7SfeKcFS4Y-YBz3656m4evQvmKDdBsWDOBYb6d8UzZegOUnjfAzW2EWhXc0hW6fiD31_mz9yTXHBQJFAkZzQATUc5IGRXmxU.lo7qIP4evHf_4s3m8luBh6n4A2FsIx2rk8wVxRGiZ8M&dib_tag=se&keywords=almofadas%2Bcheias&qid=1777743535&sprefix=almofadas%2Bcheias%2Caps%2C221&sr=8-26&ufe=app_do%3Aamzn1.fos.6a09f7ec-d911-4889-ad70-de8dd83c8a74&th=1",
    status: "disponivel"
  },
  {
    id: 4,
    nome: "Forno elétrico Mondial Family II 42L",
    categoria: "Cozinha",
    preco: 369.00,
    prioridade: "media",
    tipo: "colaborativo",
    descricao: "Forno elétrico para preparo do dia a dia.",
    link: "https://www.amazon.com.br/Forno-El%C3%A9trico-Family-Mondial-Branco/dp/B0DX2G8NY7/",
    status: "disponivel"
  },
  {
    id: 5,
    nome: "Panela de pressão elétrica Midea 6L",
    categoria: "Cozinha",
    preco: 476.03,
    prioridade: "alta",
    tipo: "colaborativo",
    descricao: "Panela elétrica prática para receitas do dia a dia.",
    link: "https://www.amazon.com.br/Panela-Press%C3%A3o-El%C3%A9trica-MasterSteam-Midea/dp/B0B4Q24P9Q/",
    status: "disponivel"
  },
  {
    id: 7,
    nome: "Kit com 3 frigideiras com tampa de vidro",
    categoria: "Cozinha",
    preco: 84.90,
    prioridade: "alta",
    tipo: "inteiro",
    descricao: "Kit essencial para montar a cozinha.",
    link: "https://www.amazon.com.br/Kit-Com-Frigideiras-Tampa-Vidro/dp/B0GN97NR5Q/",
    status: "disponivel"
  },
  {
    id: 8,
    nome: "Assadeira / forma retangular antiaderente",
    categoria: "Cozinha",
    preco: 24.69,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Item útil para assados e preparos no forno.",
    link: "https://www.amazon.com.br/Assadeira-Retangular-Antiaderente-Revestimento-Interno/dp/B0DLWWYCPT/",
    status: "disponivel"
  },
  {
    id: 9,
    nome: "Marinex - jogo de assadeiras opaline kit 3 unidades",
    categoria: "Cozinha",
    preco: 69.50,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Jogo de refratários para forno e mesa.",
    link: "https://www.amazon.com.br/Jogo-Assadeiras-Opaline-Marinex-Nadir/dp/B08G8WD9MF/",
    status: "disponivel"
  },
  {
    id: 10,
    nome: "Potes herméticos",
    categoria: "Cozinha",
    preco: 149.00,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Potes para armazenar mantimentos com organização.",
    link: "https://www.amazon.com.br/Mantimentos-Herm%C3%A9ticos-Silicone-Premium-Madeira/dp/B0DWPSMN9R/",
    status: "disponivel"
  },
  {
    id: 11,
    nome: "Porta-temperos giratório",
    categoria: "Cozinha",
    preco: 35.90,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Organizador para temperos da cozinha.",
    link: "https://www.amazon.com.br/Condimentos-Girat%C3%B3rio-Armazenamento-Especiarias-Resistente/dp/B0GSBF4XV2/",
    status: "disponivel"
  },
  {
    id: 12,
    nome: "2 lixeiras pequenas para o lavabo",
    categoria: "Banheiro / Lavabo",
    preco: 70.00,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Duas lixeiras compactas para os lavabos, considerando 2 unidades de R$ 35,00.",
    link: "https://www.amazon.com.br/Viel-Polipropileno-Compacta-Banheiro-Escrit%C3%B3rio/dp/B08YDGR7JK/",
    status: "disponivel"
  },
  {
    id: 13,
    nome: "Porta-chaves de parede",
    categoria: "Sala / Organização",
    preco: 43.00,
    prioridade: "baixa",
    tipo: "inteiro",
    descricao: "Organizador de chaves para a entrada da casa.",
    link: "https://www.amazon.com.br/Porta-Chaves-Prateleiras-Ganchos-Branco/dp/B0DWZ7GZVX/",
    status: "disponivel"
  },
  {
    id: 14,
    nome: "Tapete Casa Dona 200x300 cm caramelo",
    categoria: "Sala / Decoração",
    preco: 245.99,
    prioridade: "media",
    tipo: "colaborativo",
    descricao: "Tapete grande para compor a sala.",
    link: "https://www.amazon.com.br/Felpudo-Casa-Dona-200x300-Caramelo/dp/B0865V926N/",
    status: "disponivel"
  },
  {
    id: 15,
    nome: "Mop com cesto de inox",
    categoria: "Lavanderia / Limpeza",
    preco: 69.90,
    prioridade: "alta",
    tipo: "inteiro",
    descricao: "Item importante para a limpeza da casa.",
    link: "https://www.amazon.com.br/Girat%C3%B3rio-Esfreg%C3%A3o-Limpeza-Microfibra-Centrifuga/dp/B0GVGS8FT1/",
    status: "disponivel"
  },
  {
    id: 16,
    nome: "Cafeteira Oster Inox Compacta 0,75L OCAF300 - 220V",
    categoria: "Cozinha",
    preco: 119.00,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Cafeteira compacta em inox para o café do dia a dia dos moradores.",
    link: "https://a.co/d/0a0ZVY5B",
    status: "disponivel"
  },
  {
    id: 17,
    nome: "Fruteira Metaltec 3 cestos com rodízios",
    categoria: "Cozinha",
    preco: 143.90,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Fruteira de chão com três cestos e rodízios para organizar frutas e itens da cozinha.",
    link: "https://www.amazon.com.br/Metaltec-Fruteira-Resistente-Organizador-Refor%C3%A7ado/dp/B07RCZ552L/ref=sr_1_2_sspa?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=1UB3479VPQ4AR&dib=eyJ2IjoiMSJ9.h4T18FvkROwO74GaygVv8KNd5cf5p-yL9Noh9knZbb0-1w_xjD1COYPvVoOQY986m7L6cZpTBcvgUemh-G_P5R5L1rwtpeKFVLvaRHaVjGB0phiCwcarcEyXn_zlk-6_R_KQgl8l3808CU3srMxp61gCFoyYdj-60UpE2lEBQPSyaVK4QRi980OP2QGusBub_jsOW5-zeD8cjoVaRMI3lLP7HUpFL_0y8zLHbN3xQVDFci4KImmdpY5t5ADN8tubb8lGEOsq9xKXTmig8hFn1B2KVQt1NIV0b8Ldi1PgIv0.5lPOS3hOPMZXzrDHCTKG8NekejU0jMPKVWAEQm1QfRs&dib_tag=se&keywords=fruteira&qid=1777743687&sprefix=fruteira%2Caps%2C223&sr=8-2-spons&ufe=app_do%3Aamzn1.fos.6a09f7ec-d911-4889-ad70-de8dd83c8a74&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1",
    status: "disponivel"
  }
];

export default produtos;
