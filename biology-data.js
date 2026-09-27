/* MigaBuilder Biology Map data.
 * Split times are approximate (millions of years ago, based on TimeTree-style estimates from fossils and DNA).
 * DNA similarity figures are commonly cited estimates; each says what it measures, because different
 * measures give very different numbers and are not directly comparable. */

// Tree of life. Nodes: {id, age (million years ago), name, evolved, kids}. Leaves: {id} (details in ORGANISMS).
window.LIFE_TREE={id:'luca',age:4000,name:'Last universal common ancestor (LUCA)',evolved:'DNA, RNA and proteins, the same genetic code and a cell membrane. Every living thing today inherited these from one shared population of simple cells.',kids:[
 {id:'ecoli'},
 {id:'ae',age:2700,name:'Archaea + eukaryotes',evolved:'A branch of simple cells. Eukaryotes (cells with a nucleus) later grew out of archaea-like cells. This date is very uncertain.',kids:[
  {id:'archaea'},
  {id:'euk',age:1600,name:'Eukaryotes',evolved:'Cells with a nucleus that holds the DNA, and mitochondria — power stations that began as captured bacteria. Sexual reproduction appears.',kids:[
   {id:'plants',age:115,name:'Flowering plants (monocots)',evolved:'Plants captured another bacterium, which became the chloroplast for photosynthesis. Flowers and fruit evolved about 130 million years ago.',kids:[{id:'banana'},{id:'rice'}]},
   {id:'opis',age:1100,name:'Animals + fungi',evolved:'Animals and fungi are closer to each other than to plants: both take in food instead of making it from sunlight, and both use chitin.',kids:[
    {id:'fungi',age:650,name:'Fungi',evolved:'Thread-like bodies that digest food outside themselves and absorb it.',kids:[{id:'yeast'},{id:'mushroom'}]},
    {id:'animals',age:780,name:'Animals',evolved:'Many-celled bodies held together by collagen, with cells that specialise for different jobs.',kids:[
     {id:'sponge'},
     {id:'eumet',age:720,name:'Animals with tissues',evolved:'Nerves, muscles and a gut — the first true tissues.',kids:[
      {id:'jellyfish'},
      {id:'bilat',age:694,name:'Bilaterians',evolved:'A left and a right side, a head end, a through-gut from mouth to anus, and Hox genes that lay out the body from head to tail. Flies and humans still use the same Hox genes.',kids:[
       {id:'proto',age:670,name:'Protostomes',evolved:'In the embryo the first opening becomes the mouth.',kids:[
        {id:'ecdy',age:640,name:'Moulting animals',evolved:'A tough outer skin or exoskeleton that is shed (moulted) to grow.',kids:[
         {id:'insects',age:345,name:'Insects',evolved:'Six legs, three body parts and — for most — wings.',kids:[{id:'fly'},{id:'bee'}]},
         {id:'worm'}]},
        {id:'octopus'}]},
       {id:'deut',age:650,name:'Deuterostomes',evolved:'In the embryo the first opening becomes the anus and the mouth forms second — as it does in you.',kids:[
        {id:'urchin'},
        {id:'chord',age:600,name:'Chordates',evolved:'A stiff rod along the back (notochord), a nerve cord above it, gill slits and a tail — you had all of these as an early embryo.',kids:[
         {id:'seasquirt'},
         {id:'vert',age:560,name:'Vertebrates',evolved:'A backbone and skull, a brain in parts, and neural crest cells. The whole genome doubled twice, giving spare genes to experiment with.',kids:[
          {id:'lamprey'},
          {id:'jawed',age:465,name:'Jawed vertebrates',evolved:'Jaws and teeth, paired fins, and an adaptive immune system with antibodies.',kids:[
           {id:'shark'},
           {id:'bony',age:435,name:'Bony vertebrates',evolved:'A skeleton of bone and an air sac that became the swim bladder in fish and lungs in us.',kids:[
            {id:'zebrafish'},
            {id:'lobe',age:413,name:'Lobe-finned vertebrates',evolved:'Fleshy fins with the same bones as your arm: one bone, then two, then many.',kids:[
             {id:'coelacanth'},
             {id:'tetra',age:352,name:'Tetrapods',evolved:'Four limbs with fingers and toes; lungs and a neck for life on land.',kids:[
              {id:'frog'},
              {id:'amniote',age:319,name:'Amniotes',evolved:'The amniotic egg with its own water supply, so eggs could be laid on dry land; waterproof skin.',kids:[
               {id:'saur',age:280,name:'Reptiles and birds',evolved:'Scales. Birds are living dinosaurs — the chicken is closer to T. rex than a lizard is.',kids:[{id:'lizard'},{id:'chicken'}]},
               {id:'mammals',age:180,name:'Mammals',evolved:'Hair, milk, three tiny middle-ear bones and a warm body kept at a steady temperature.',kids:[
                {id:'platypus'},
                {id:'therian',age:160,name:'Live-bearing mammals',evolved:'Babies born alive instead of hatching from eggs.',kids:[
                 {id:'kangaroo'},
                 {id:'placental',age:99,name:'Placental mammals',evolved:'A placenta that feeds the baby inside the mother for a long pregnancy.',kids:[
                  {id:'elephant'},
                  {id:'boreo',age:94,name:'Northern placentals',evolved:'A huge group that spread across the northern continents.',kids:[
                   {id:'laur',age:79,name:'Laurasiatherians',evolved:'Bats, carnivores, hoofed mammals and whales.',kids:[
                    {id:'bat'},
                    {id:'scrot',age:77,name:'Carnivores + hoofed mammals',evolved:'',kids:[
                     {id:'ferae',age:55,name:'Carnivores',evolved:'Sharp cutting cheek teeth (carnassials) for slicing meat.',kids:[{id:'dog'},{id:'cat'}]},
                     {id:'ung',age:76,name:'Hoofed mammals',evolved:'Hooves for running.',kids:[
                      {id:'horse'},
                      {id:'cetart',age:62,name:'Even-toed hoofed mammals',evolved:'Two main toes per foot; many chew the cud.',kids:[
                       {id:'pig'},
                       {id:'whippo',age:55,name:'Cattle + whales',evolved:'Whales evolved from four-legged land animals related to hippos and went back to the sea about 50 million years ago.',kids:[{id:'cow'},{id:'whale'}]}]}]}]}]},
                   {id:'euarch',age:90,name:'Primates + rodents',evolved:'Rodents, rabbits and primates share an ancestor that lived alongside the dinosaurs.',kids:[
                    {id:'glires',age:82,name:'Rodents + rabbits',evolved:'Front teeth that never stop growing.',kids:[{id:'mouse'},{id:'rabbit'}]},
                    {id:'primates',age:74,name:'Primates',evolved:'Grasping hands with nails, forward-facing eyes for judging distance, and big brains.',kids:[
                     {id:'lemur'},
                     {id:'anthro',age:43,name:'Monkeys and apes',evolved:'Larger brains, daytime life and flat faces.',kids:[
                      {id:'marmoset'},
                      {id:'catar',age:29,name:'Old World monkeys + apes',evolved:'Full three-colour vision (red, green and blue) and nostrils that point down.',kids:[
                       {id:'macaque'},
                       {id:'apes',age:20,name:'Apes',evolved:'No tail and very mobile shoulders for swinging through trees.',kids:[
                        {id:'gibbon'},
                        {id:'great',age:15.2,name:'Great apes',evolved:'Bigger brains, long childhoods and tool use.',kids:[
                         {id:'orangutan'},
                         {id:'african',age:8.6,name:'African apes',evolved:'Knuckle-walking ancestors in Africa.',kids:[
                          {id:'gorilla'},
                          {id:'hominini',age:6.4,name:'Humans + chimpanzees',evolved:'Our last shared ancestor with chimps and bonobos. After the split, the human line began walking on two legs.',kids:[
                           {id:'pan',age:2,name:'Chimpanzees + bonobos',evolved:'Split when the Congo River separated their ancestors.',kids:[{id:'chimp'},{id:'bonobo'}]},
                           {id:'homo',age:0.6,name:'Humans + Neanderthals',evolved:'Big brains, fire, complex tools. Modern humans and Neanderthals later met again and had children together.',kids:[{id:'neanderthal'},{id:'human'}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]};

// Organisms: emoji, name, scientific name, what DNA similarity to humans means for it [value or null, what it measures],
// genome size (letters), protein-coding genes, chromosomes (per body cell), about, fact.
window.ORGANISMS={
 human:['🧑','Human','Homo sapiens',[100,'Any two people share about 99.9% of their DNA letters'],'3.1 billion','about 20,000','46','We are one young species: all living people descend from Africans who lived about 300,000 years ago.','If you read your DNA aloud at one letter per second, day and night, it would take about 98 years.'],
 neanderthal:['🪨','Neanderthal (extinct)','Homo neanderthalensis',[99.7,'of DNA letters identical to ours'],'about 3 billion','about 20,000','46 (probably)','Our closest known relatives. They lived in Europe and Asia until about 40,000 years ago, made tools, used fire and buried their dead.','Most people with ancestry from outside Africa carry about 1–2% Neanderthal DNA, including genes that affect immunity and skin.'],
 chimp:['🐒','Chimpanzee','Pan troglodytes',[98.8,'of DNA letters identical (in the parts that line up)'],'3.1 billion','about 20,000','48','Our closest living relative along with the bonobo. Counting inserted and deleted pieces too, the match is about 96%.','Humans have 46 chromosomes and chimps 48 because two ape chromosomes fused into our chromosome 2 — you can still see the join.'],
 bonobo:['🦧','Bonobo','Pan paniscus',[98.7,'of DNA letters identical'],'3 billion','about 20,000','48','Just as close to us as chimps. Bonobos live in female-led groups and solve conflicts peacefully more often than chimps.','Bonobos and chimps split only about 2 million years ago, when the Congo River divided their range.'],
 gorilla:['🦍','Gorilla','Gorilla gorilla',[98.4,'of DNA letters identical'],'3 billion','about 20,000','48','The largest primate. About 15% of our genome is actually closer to the gorilla’s than to the chimp’s, because the ape family tree split quickly.','Gorillas live mostly on plants and can eat about 20 kg of leaves a day.'],
 orangutan:['🦧','Orangutan','Pongo pygmaeus',[97,'of DNA letters identical'],'3.1 billion','about 20,000','48','The Asian great ape, living in the rainforests of Borneo and Sumatra.','Its genome has changed less than those of the other great apes since they split.'],
 gibbon:['🐒','Gibbon','Nomascus leucogenys',[96,'of DNA letters identical'],'2.9 billion','about 20,000','38–52 (depends on species)','Small apes that swing through the trees at up to 55 km/h.','Gibbon chromosomes have been shuffled far more than those of other apes.'],
 macaque:['🐵','Rhesus macaque','Macaca mulatta',[93,'of DNA letters identical'],'2.9 billion','about 21,000','42','An Old World monkey widely used in medical research.','The “Rh factor” in blood groups (Rh+ and Rh−) is named after the rhesus monkey.'],
 marmoset:['🐒','Marmoset','Callithrix jacchus',[null,'Nearly all its genes match ours, but more DNA letters differ than in Old World monkeys'],'2.9 billion','about 21,000','46','A tiny South American monkey. Most marmosets are born as twins.','Twin marmosets swap blood cells in the womb, so each twin carries some of the other’s cells for life.'],
 lemur:['🐾','Lemur','Lemur catta',[null,'Shares almost all its genes with us; our last common ancestor lived about 74 million years ago'],'2.2 billion','about 20,000','56','Lemurs live only on Madagascar and show what early primates were like.','Ring-tailed lemurs hold “stink fights”, wafting scent at rivals with their tails.'],
 mouse:['🐭','Mouse','Mus musculus',[85,'of DNA letters identical in protein-coding genes (only ~40% of all DNA lines up at all)'],'2.7 billion','about 22,000','40','Almost every human gene has a mouse version, which is why mice are the most used animals in medical research.','Only about 300 mouse genes have no clear match in humans.'],
 rabbit:['🐰','Rabbit','Oryctolagus cuniculus',[null,'Almost all genes have a human counterpart'],'2.7 billion','about 20,000','44','Closer to mice than to cats or dogs.','Rabbits eat some of their own droppings to digest their food twice.'],
 dog:['🐕','Dog','Canis familiaris',[null,'Almost all genes have a human counterpart'],'2.4 billion','about 19,000','78','Dogs were tamed from wolves at least 15,000 years ago — the first domestic animal.','Dogs and people have evolved together: some dog breeds gained extra copies of starch-digesting genes, just like farming humans.'],
 cat:['🐈','Cat','Felis catus',[null,'Almost all genes have a human counterpart'],'2.5 billion','about 20,000','38','Cats probably tamed themselves by hunting mice in the first farmers’ grain stores about 10,000 years ago.','Cats cannot taste sweetness: their sweet-taste gene is broken by a mutation.'],
 horse:['🐎','Horse','Equus caballus',[null,'Almost all genes have a human counterpart'],'2.5 billion','about 20,000','64','Horses walk on a single toe on each foot — the other toes shrank away over 50 million years.','The horse family tree is one of the best fossil records of evolution.'],
 pig:['🐖','Pig','Sus scrofa',[null,'Almost all genes have a human counterpart; organs are similar in size'],'2.5 billion','about 21,000','38','Pig organs are similar enough in size and function that gene-edited pig hearts and kidneys have been transplanted into people.','Insulin from pigs was used to treat diabetes for decades before human insulin could be made by bacteria.'],
 cow:['🐄','Cow','Bos taurus',[80,'of its genes are very similar to human genes'],'2.7 billion','about 22,000','60','Cows are closer relatives of whales than of horses.','A cow has one stomach with four compartments, helped by trillions of microbes that digest grass.'],
 whale:['🐋','Whale','Balaenoptera musculus',[null,'Almost all genes have a human counterpart'],'2.4 billion','about 20,000','44','Whales are mammals whose ancestors walked on land about 50 million years ago; they still have tiny hip bones.','The blue whale is the largest animal that has ever lived — yet rarely gets cancer, possibly thanks to extra tumour-fighting genes.'],
 bat:['🦇','Bat','Myotis myotis',[null,'Almost all genes have a human counterpart'],'2 billion','about 20,000','44','The only mammals that truly fly. Bat wings are hands with very long fingers.','Bats carry many viruses without getting sick because of an unusually calm immune system.'],
 elephant:['🐘','Elephant','Loxodonta africana',[null,'Almost all genes have a human counterpart'],'3.2 billion','about 20,000','56','Elephants belong to an African group of mammals that also includes manatees and aardvarks.','Elephants have 20 copies of the cancer-protecting gene TP53; we have one.'],
 kangaroo:['🦘','Kangaroo','Macropus eugenii',[null,'Most genes have a human counterpart'],'3 billion','about 18,000','16','A marsupial: the baby is born tiny and grows in its mother’s pouch.','A newborn kangaroo is about the size of a jellybean.'],
 platypus:['🦫','Platypus','Ornithorhynchus anatinus',[82,'of its genes are also found in humans and other mammals and birds'],'2 billion','about 18,500','52 (including 10 sex chromosomes)','A mammal that lays eggs and feeds its young milk from patches of skin — a living link to early mammals.','Its genome is a mix of mammal, bird-like and reptile-like features, and males have venom spurs.'],
 chicken:['🐓','Chicken','Gallus gallus',[60,'of its genes have a matching human gene'],'1.1 billion','about 17,000','78','Birds are living dinosaurs; chickens descend from the red junglefowl of Southeast Asia.','Chickens still have genes for making teeth — they are switched off.'],
 lizard:['🦎','Lizard','Anolis carolinensis',[null,'Many genes have a human counterpart'],'1.8 billion','about 18,000','36','Reptiles split from the mammal line about 319 million years ago.','Some lizards can drop and regrow their tails; scientists study the genes involved for healing.'],
 frog:['🐸','Frog','Xenopus tropicalis',[null,'Many human disease genes have a frog counterpart'],'1.7 billion','about 20,000','20','Amphibians live partly in water and partly on land, like the first four-legged animals.','A frog egg was used in the first successful cloning of an animal from a body cell (1958).'],
 coelacanth:['🐟','Coelacanth','Latimeria chalumnae',[null,'Its fin genes help show how legs evolved'],'2.9 billion','about 20,000','48','A lobe-finned fish thought to have died out with the dinosaurs — until one was caught in 1938.','Its fleshy fins move in the same order as a walking animal’s legs.'],
 zebrafish:['🐠','Zebrafish','Danio rerio',[70,'of human genes have a matching zebrafish gene (84% of known human disease genes do)'],'1.4 billion','about 26,000','50','See-through embryos let scientists watch organs grow, so zebrafish are used to study diseases and medicines.','Zebrafish can regrow damaged heart muscle — something humans cannot.'],
 shark:['🦈','Shark','Callorhinchus milii',[null,'Some of its genes have changed less than in any other vertebrate studied'],'1 billion','about 19,000','varies','Sharks have skeletons of cartilage, not bone, and were around before trees.','The elephant shark genome is the slowest-changing vertebrate genome known.'],
 lamprey:['🐍','Lamprey','Petromyzon marinus',[null,'Many genes have human counterparts'],'1.6 billion','about 20,000','about 168','A jawless fish — it shows what vertebrates were like before jaws.','Lampreys fight infections with a completely different kind of antibody from ours.'],
 seasquirt:['🫧','Sea squirt','Ciona intestinalis',[null,'Our closest invertebrate relatives'],'160 million','about 16,000','28','As a larva it swims like a tadpole with a notochord and nerve cord; as an adult it glues itself to a rock.','When it settles down, the sea squirt digests most of its own brain — it no longer needs it.'],
 urchin:['🟣','Sea urchin','Strongylocentrotus purpuratus',[30,'of its genes (about 7,000) have a human counterpart'],'800 million','about 23,000','42','Although spiny and star-shaped as adults, sea urchins are more closely related to us than insects are.','Sea urchins have no eyes, but genes for light sensing are active all over their tube feet.'],
 octopus:['🐙','Octopus','Octopus bimaculoides',[null,'Fewer shared genes; many octopus genes are unique'],'2.7 billion','about 33,000','60','Very intelligent molluscs, related to snails.','The octopus camera-eye evolved separately from ours — a famous case of convergent evolution. Octopuses also edit their RNA to adapt to cold water.'],
 fly:['🪰','Fruit fly','Drosophila melanogaster',[60,'of its genes have a human counterpart (75% of known human disease genes have a fly match)'],'140 million','about 14,000','8','The first animal with its genome fully studied in detail; it has won six Nobel Prizes worth of research.','A single fly gene (eyeless) can switch on building an eye — and the mouse version of that gene works in flies too.'],
 bee:['🐝','Honey bee','Apis mellifera',[null,'Some bee genes for body clocks and learning are more like ours than a fly’s are'],'250 million','about 12,000','32 (females), 16 (males)','Honey bees live in colonies of up to 60,000.','Queens and workers have the same DNA — what they are fed as larvae (royal jelly) switches genes differently.'],
 worm:['🪱','Roundworm','Caenorhabditis elegans',[40,'of its genes have a human counterpart'],'100 million','about 20,000','12','A 1 mm see-through worm with exactly 959 body cells — every cell’s family history is known.','It was the first animal whose whole genome was read (1998) and has as many genes as we do.'],
 jellyfish:['🪼','Jellyfish','Aurelia aurita',[null,'Shares many basic genes for nerves and muscles'],'about 700 million','about 28,000','44','Among the first animals with nerves and muscles; no brain, heart or bones.','A jellyfish protein (GFP) that glows green is used in labs worldwide to light up genes — it won a Nobel Prize.'],
 sponge:['🧽','Sponge','Amphimedon queenslandica',[null,'Has many “animal” genes, including some used for nerves in other animals'],'170 million','about 30,000','—','The simplest animals: no nerves, muscles or organs.','Push a living sponge through a sieve and the cells crawl back together into a sponge.'],
 yeast:['🍞','Yeast','Saccharomyces cerevisiae',[30,'of its genes have a human counterpart; many human genes can replace the yeast version'],'12 million','about 6,000','16 (per set)','A single-celled fungus used for bread, beer and wine for thousands of years.','Scientists swapped hundreds of yeast genes for their human versions — and nearly half of those yeast cells still lived.'],
 mushroom:['🍄','Mushroom','Agaricus bisporus',[null,'Shares ancient eukaryote genes'],'30 million','about 11,000','13 (per set)','Fungi are closer to animals than to plants.','The largest living thing on Earth is probably a honey fungus in Oregon, covering almost 10 km².'],
 banana:['🍌','Banana','Musa acuminata',[60,'of its genes have a recognisable human counterpart — but the proteins are on average only ~40% alike'],'520 million','about 36,000','33 (seedless kinds have 3 sets)','Plants and animals split over 1.5 billion years ago, yet share genes for basic cell jobs like copying DNA and making energy.','The famous “60% like a banana” is about shared gene families, not about 60% of DNA letters matching.'],
 rice:['🌾','Rice','Oryza sativa',[null,'Shares basic cell genes'],'430 million','about 38,000','24','Rice feeds more than half the world’s people.','Rice has more genes than we do — genome size and gene count say little about complexity.'],
 archaea:['🔴','Archaea','Sulfolobus acidocaldarius',[null,'Shares only the core genes of all life'],'2.2 million','about 2,300','1 (circular)','Single cells without a nucleus that can live in boiling acid, salt lakes or your gut. They look like bacteria but are closer to us.','Our cells’ DNA-copying machinery is more like that of archaea than of bacteria.'],
 ecoli:['🦠','Bacterium (E. coli)','Escherichia coli',[null,'Shares only a few hundred core genes with us — for copying DNA and making proteins'],'4.6 million','about 4,300','1 (circular)','Bacteria were the first life on Earth and are still the most numerous. You carry about as many bacterial cells as human cells.','Bacteria can swap genes with each other directly, which is how antibiotic resistance spreads.']
};

// Key events in the history of life (million years ago)
window.LIFE_TIMELINE=[
 [4540,'🌍','Earth forms','The planet forms from dust and rock around the young Sun.'],
 [4000,'🦠','First life','Simple cells appear in the oceans, perhaps near hot vents. They already use DNA, RNA and proteins.'],
 [3500,'🪨','Microbial mats','Stromatolites — layered mats built by bacteria — are some of the oldest fossils.'],
 [2400,'🫧','Oxygen appears','Cyanobacteria fill the air with oxygen from photosynthesis (the Great Oxidation Event).'],
 [1800,'🔬','Cells with a nucleus','Eukaryotic cells appear, powered by mitochondria that began as captured bacteria.'],
 [1050,'🌿','Sex and many-celled life','Red algae fossils show many-celled bodies and sexual reproduction.'],
 [700,'🧽','First animals','Sponge-like animals appear in the sea.'],
 [538,'💥','Cambrian explosion','Most animal body plans appear in a few million years: eyes, shells, legs and the first vertebrates.'],
 [470,'🌱','Plants reach land','Moss-like plants start to cover the land.'],
 [375,'🐟','Fish walk','Fish like Tiktaalik, with limb-like fins, begin to move onto land.'],
 [312,'🥚','Amniotic egg','The first reptile-like animals lay eggs on dry land.'],
 [252,'☄️','The Great Dying','The worst mass extinction: about 90% of sea species vanish.'],
 [230,'🦖','First dinosaurs','Dinosaurs appear; the first mammals follow soon after (about 200 million years ago).'],
 [150,'🪶','First birds','Archaeopteryx — half dinosaur, half bird.'],
 [130,'🌸','Flowers','Flowering plants spread, with insects as pollinators.'],
 [66,'🌋','Dinosaurs wiped out','An asteroid ends the age of dinosaurs (birds survive). Mammals spread into the empty niches.'],
 [50,'🐋','Whales return to the sea','Land mammals related to hippos start living in water.'],
 [6.4,'🐒','Humans and chimps split','Our last common ancestor with chimpanzees lives in Africa.'],
 [3.2,'🦴','“Lucy”','Australopithecus walks upright but still has a small, ape-sized brain.'],
 [2.8,'🪓','The genus Homo','The first members of our genus make stone tools.'],
 [1.9,'🚶','Homo erectus leaves Africa','Human relatives spread across Asia, using fire.'],
 [0.3,'🧑','Homo sapiens','Our species appears in Africa (fossils from Morocco are about 300,000 years old).'],
 [0.065,'🌏','Out of Africa','A group of modern humans spreads from Africa across the world, meeting Neanderthals and Denisovans.'],
 [0.012,'🌾','Farming','People start farming, and some populations evolve new traits like digesting milk as adults.']
];

// DNA building levels: [emoji, name, size, text]
window.DNA_LEVELS=[
 ['🧍','Your body','about 37 trillion cells','Almost every cell holds a full copy of your DNA — about 2 metres of it, folded into a space 100 times thinner than a hair.'],
 ['🔵','Cell nucleus','about 6 micrometres','The nucleus is the control room of the cell, where the DNA is kept safe. (Red blood cells throw theirs out to make room for oxygen.)'],
 ['🧷','Chromosome','46 in each cell','The DNA is split into 46 long pieces called chromosomes: 23 from your mother and 23 from your father. Pairs 1–22 are the same in everyone; pair 23 is the sex chromosomes (XX or XY, with some natural variations).'],
 ['🧵','Chromatin','DNA wound on spools','DNA is wrapped around protein spools called histones, like thread on a bobbin (nucleosomes). Tightly wound parts are switched off; loose parts can be read.'],
 ['🧬','Gene','about 20,000 protein-making genes','A gene is a stretch of DNA with the recipe for one protein (or a working RNA). Genes are only about 1–2% of your DNA; the rest includes switches, spacers, and old virus DNA.'],
 ['🪜','Double helix','2 nanometres wide','Two strands twist around each other like a spiral ladder. The rails are sugar and phosphate; the rungs are pairs of bases.'],
 ['🔗','Base pair','3.1 billion pairs','The rungs: A always pairs with T, and G always pairs with C. So each strand is a mirror of the other — a built-in backup used for copying and repair.'],
 ['⚛️','Nucleotide','the single letter','Each letter is a nucleotide: a phosphate group, a sugar (deoxyribose) and one of four bases — adenine (A), thymine (T), guanine (G) or cytosine (C).']
];

// Gene expression: [title, where, text]
window.EXPRESSION_STEPS=[
 ['A gene is switched on','Nucleus','A signal (like a hormone, food, or the cell’s type) makes proteins called transcription factors land on the gene’s switch region (the promoter and enhancers).'],
 ['Transcription: DNA → RNA','Nucleus','The enzyme RNA polymerase unzips a short stretch of DNA and copies the gene into messenger RNA (mRNA). RNA uses U (uracil) instead of T.'],
 ['Splicing','Nucleus','Genes have useful parts (exons) and spacers (introns). The spacers are cut out and the exons joined. By joining exons in different ways, one gene can make several proteins.'],
 ['Out of the nucleus','Nuclear pores','The finished mRNA gets a cap and a tail to protect it, then travels out through pores in the nucleus.'],
 ['Translation: RNA → protein','Ribosome','A ribosome reads the mRNA three letters (a codon) at a time. Transfer RNAs bring the matching amino acid for each codon, and the ribosome chains them together. AUG means start; UAA, UAG and UGA mean stop.'],
 ['Folding','Cytoplasm','The chain of amino acids folds into a precise 3-D shape, sometimes helped by chaperone proteins. The shape decides the job — a single wrong letter can change it.'],
 ['The protein gets to work','Everywhere','Proteins are enzymes that speed up reactions, hormones like insulin, haemoglobin that carries oxygen, antibodies, muscle fibres, and the keratin in hair.'],
 ['Turning genes up and down','Whole cell','Epigenetic marks — chemical tags on DNA (methylation) and on the histone spools — keep genes on or off and can be passed on when cells divide. Diet, stress and age can change some of them.']
];
// Same DNA, different cells: [emoji, cell, genes switched on, what it makes]
window.CELL_TYPES=[
 ['🔴','Red blood cell (young)','HBB, HBA (haemoglobin)','Haemoglobin to carry oxygen — it fills about a third of the cell.'],
 ['🍬','Pancreas beta cell','INS (insulin)','Insulin, which lets other cells take up sugar from the blood.'],
 ['💪','Muscle cell','MYH, ACTA1 (myosin and actin)','Motor proteins that slide past each other to make the muscle contract.'],
 ['🧠','Nerve cell','SCN, SYP and neurotransmitter genes','Channels and messenger chemicals that send electrical signals.'],
 ['👁️','Eye lens cell','CRYAA (crystallin)','See-through crystallin proteins that focus light — they last your whole life.'],
 ['🧴','Skin cell','KRT (keratins)','Tough keratin fibres that make skin, hair and nails strong.'],
 ['🛡️','B cell (immune)','IGH (antibody genes)','Antibodies — each B cell shuffles its antibody genes to make a unique one.']
];

// Mutation types: [id, name, what happens, example, effect]
window.MUTATION_TYPES=[
 ['silent','Silent substitution','One letter is swapped, but the new codon still codes for the same amino acid (the genetic code has spares).','GCC → GCT both make alanine.','Usually no effect.'],
 ['missense','Missense substitution','One letter is swapped and one amino acid in the protein changes.','Sickle cell: GAG → GTG changes glutamic acid to valine in haemoglobin, so red cells can bend into sickles.','Can be harmless, harmful or helpful — sickle-cell carriers are protected against malaria.'],
 ['nonsense','Nonsense substitution','A letter change creates a STOP codon, cutting the protein short.','Some forms of cystic fibrosis and Duchenne muscular dystrophy.','Usually the protein does not work.'],
 ['frameshift','Frameshift insertion or deletion','Adding or removing letters (not in threes) shifts the reading frame, so every codon after it is read wrongly.','Tay–Sachs disease (a 4-letter insertion); CCR5-Δ32 (a 32-letter deletion) makes carriers resistant to most HIV.','Usually a broken protein.'],
 ['inframe','In-frame deletion or insertion','Three letters (one codon) are removed or added: one amino acid is lost or gained, the rest is read normally.','The commonest cystic fibrosis mutation (ΔF508) removes one phenylalanine from the CFTR protein.','The protein may misfold.'],
 ['repeat','Repeat expansion','A short repeated piece (like CAG CAG CAG…) grows longer when passed on.','Huntington’s disease occurs with 36 or more CAG repeats in the HTT gene.','Often worsens in later generations.'],
 ['duplication','Gene duplication','A whole gene is copied. The spare copy can later evolve a new job.','Our red–green colour vision came from a duplicated opsin gene; people from farming populations often carry extra copies of the starch-digesting AMY1 gene.','A major source of new genes in evolution.'],
 ['chromosome','Chromosome change','Large pieces or whole chromosomes are gained, lost, flipped or swapped.','Down syndrome: an extra copy of chromosome 21. Some leukaemias: pieces of chromosomes 9 and 22 swap places.','Can change many genes at once.']
];
window.MUTATION_CAUSES=[
 ['📋','Copying errors','Each time a cell divides it copies 6 billion letters. Proofreading leaves about one mistake per billion letters.'],
 ['☀️','UV light','Sunlight can glue neighbouring T letters together. Too much damage leads to skin cancer — so use sun protection.'],
 ['🚬','Chemicals','Tobacco smoke contains more than 60 chemicals that damage DNA.'],
 ['☢️','Radiation','X-rays and radioactivity can break both DNA strands.'],
 ['🦠','Some viruses','Viruses such as HPV insert their own DNA or disturb cell controls — vaccines prevent this.'],
 ['🧰','Repair systems','Cells have many repair kits that fix almost all damage. Mutations in repair genes (like BRCA1) raise cancer risk.'],
 ['👶','New in every baby','Each person has about 60–70 brand-new mutations not found in either parent. Almost all are harmless.'],
 ['🧬','Fuel for evolution','Without mutations there would be no variation — and no evolution.']
];

// Human diversity — migration routes and adaptations (lon, lat)
window.MIGRATION=[
 {name:'Homo sapiens appears in Africa',when:'about 300,000 years ago',pts:[[-8.9,31.9],null,[35.9,5.3]]},
 {name:'Out of Africa',when:'about 70,000–60,000 years ago',pts:[[36,4],[43,13],[48,22],[35,32]]},
 {name:'South Asia and Australia',when:'reached Australia at least 50,000 years ago',pts:[[48,22],[62,25],[78,20],[95,15],[105,2],[120,-5],[134,-22]]},
 {name:'Europe',when:'about 45,000 years ago',pts:[[35,32],[30,40],[20,46],[5,48]]},
 {name:'East Asia',when:'about 45,000–40,000 years ago',pts:[[62,25],[85,32],[105,33],[116,40]]},
 {name:'Siberia and the Bering land bridge',when:'about 30,000–20,000 years ago',pts:[[85,32],[100,55],[140,62],[170,65],[-165,65]]},
 {name:'The Americas',when:'at least 21,000–16,000 years ago',pts:[[-165,65],[-130,55],[-110,40],[-100,20],[-78,5],[-70,-20],[-73,-41]]},
 {name:'Pacific islands',when:'about 3,000–750 years ago',pts:[[120,-5],[150,-8],[178,-18],[174,-41],null,[-179,-18],[-150,-17],[-155,20],null,[-150,-17],[-109,-27]]},
 {name:'Madagascar',when:'about 1,500 years ago, from Borneo',pts:[[110,0],[80,-8],[47,-19]]}
];
window.ADAPTATIONS=[
 {lon:88,lat:31,emoji:'🏔️',name:'Tibetan high-altitude life',text:'A version of the EPAS1 gene — inherited from Denisovans — lets Tibetans live at 4,000 m without their blood becoming too thick.'},
 {lon:-70,lat:-15,emoji:'⛰️',name:'Andean high-altitude life',text:'Andean people adapted to thin air differently: bigger chests and more haemoglobin, using other genes — evolution found two solutions.'},
 {lon:10,lat:57,emoji:'🥛',name:'Drinking milk as an adult (Europe)',text:'A change near the LCT gene keeps lactase switched on in adults. It spread in the last ~7,000 years among dairy farmers.'},
 {lon:36,lat:-1,emoji:'🐄',name:'Drinking milk as an adult (East Africa)',text:'Herders in East Africa and Arabia evolved the same ability with different mutations — convergent evolution.'},
 {lon:5,lat:8,emoji:'🦟',name:'Sickle-cell trait and malaria',text:'Carrying one sickle-cell gene protects against severe malaria, so it is common where malaria was common (Africa, the Middle East, India, the Mediterranean). Two copies cause sickle-cell disease.'},
 {lon:15,lat:48,emoji:'☀️',name:'Lighter skin at high latitudes',text:'Where UV is weak, lighter skin helps make vitamin D. Variants of SLC24A5 and SLC45A2 spread in Europe over the last ~8,000 years. Lighter skin evolved separately in East Asia.'},
 {lon:20,lat:0,emoji:'🌞',name:'Darker skin in strong sun',text:'Dark skin protects folate and DNA from strong UV. Africa has the widest range of skin colours in the world.'},
 {lon:116,lat:40,emoji:'💇',name:'Thicker hair (East Asia)',text:'An EDAR variant common in East Asians and Native Americans gives thicker hair, more sweat glands and shovel-shaped incisors.'},
 {lon:118,lat:25,emoji:'🍶',name:'Alcohol flush (East Asia)',text:'An ALDH2 variant common in southern China, Japan and Korea makes people flush after alcohol and lowers alcohol use.'},
 {lon:-45,lat:70,emoji:'🐟',name:'Omega-3 diet (Greenland Inuit)',text:'FADS gene variants help the body handle a diet very rich in fish and seal fat.'},
 {lon:121,lat:5,emoji:'🤿',name:'Deep diving (Bajau sea nomads)',text:'The Bajau of Southeast Asia have bigger spleens, which store oxygen-rich blood for long breath-hold dives.'},
 {lon:145,lat:-6,emoji:'🧬',name:'Denisovan DNA (Papua New Guinea)',text:'Papuans and Aboriginal Australians carry about 3–6% DNA from Denisovans, an extinct human group known from a few bones in Siberia and Tibet.'}
];
// Key facts: [emoji, title, text]
window.DIVERSITY_FACTS=[
 ['🤝','99.9% the same','Any two people share about 99.9% of their DNA letters. The 0.1% — a few million letters — explains the differences we inherit.'],
 ['🔀','More variation within groups than between them','About 85–90% of human genetic variation is found between people of the same population. Two neighbours can differ more than two people from different continents.'],
 ['🌍','Africa is the most diverse','Humans lived longest in Africa, so African populations hold the most genetic diversity. The people who left Africa carried only part of it.'],
 ['🌈','Change is gradual','Genetic differences change gradually from place to place (clines). There are no sharp borders in our DNA, so “races” are not clear biological groups.'],
 ['🗣️','Ethnic groups are about culture','An ethnic group shares a language, history, customs or identity. It overlaps with ancestry, but it is not defined by DNA.'],
 ['🧑‍🤝‍🧑','Everyone is related','Go back 30 generations and your family tree has over a billion spots — more than the people alive then. All humans share ancestors surprisingly recently.'],
 ['🪨','Ancient mixing','People outside Africa carry about 1–2% Neanderthal DNA; people in Oceania also carry Denisovan DNA. Some Africans carry DNA from other archaic humans.'],
 ['🩺','Why ancestry still matters in medicine','Some gene variants are more common in some ancestries: sickle cell (Africa, Middle East, India), thalassaemia (Mediterranean, Asia), Tay–Sachs (Ashkenazi Jewish), cystic fibrosis and haemochromatosis (northern Europe), lactose intolerance (most of the world). Doctors use ancestry as a clue, but your own genes matter more than your group.'],
 ['⚠️','Genetics is not destiny','Most traits — height, intelligence, health — depend on thousands of genes plus environment, food, education and chance. Misusing genetics to rank groups has caused great harm and is not supported by science.']
];

// Extra quiz questions: [question, answer, wrong answers, explanation, topic]
window.BIO_QUESTIONS=[
 ['Which four letters (bases) make up DNA?','A, T, G and C',['A, U, G and C','A, B, C and D','X, Y, Z and W'],'DNA uses adenine, thymine, guanine and cytosine. RNA uses U (uracil) instead of T.','dna'],
 ['In DNA, adenine (A) always pairs with…','Thymine (T)',['Guanine (G)','Cytosine (C)','Uracil (U)'],'A pairs with T and G pairs with C.','dna'],
 ['How many chromosomes are in most human body cells?','46',['23','48','64'],'23 pairs: one set from each parent.','dna'],
 ['About how many letters (base pairs) are in one set of human DNA?','3.1 billion',['3.1 million','31,000','3.1 trillion'],'About 3.1 billion base pairs per set; each cell has two sets.','dna'],
 ['About how many protein-making genes do humans have?','About 20,000',['About 2,000','About 200,000','About 2 million'],'Surprisingly few — a roundworm has about the same number.','dna'],
 ['What is the shape of a DNA molecule called?','A double helix',['A single ring','A triple spiral','A cube'],'Two strands twisted like a spiral ladder.','dna'],
 ['What are the three parts of a nucleotide?','Phosphate, sugar and a base',['Protein, fat and sugar','Salt, water and a base','Amino acid, sugar and water'],'The sugar is deoxyribose.','dna'],
 ['DNA is wound around proteins called…','Histones',['Ribosomes','Enzymes','Hormones'],'Like thread on spools; together they are chromatin.','dna'],
 ['Copying a gene from DNA into RNA is called…','Transcription',['Translation','Mutation','Replication'],'Transcription happens in the nucleus.','expression'],
 ['Reading mRNA to build a protein is called…','Translation',['Transcription','Splicing','Folding'],'Ribosomes translate the codons into amino acids.','expression'],
 ['How many letters make one codon?','3',['1','2','4'],'Each three-letter codon stands for one amino acid or a stop signal.','expression'],
 ['Which codon starts almost every protein?','AUG',['UAA','GGG','UGA'],'AUG codes for methionine and marks the start.','expression'],
 ['Which part of the cell builds proteins?','The ribosome',['The nucleus','The cell membrane','The mitochondrion'],'Ribosomes read mRNA and join amino acids.','expression'],
 ['Why are a nerve cell and a muscle cell different if they have the same DNA?','They switch on different genes',['They have different DNA','One of them has no DNA','They have different numbers of chromosomes'],'Gene expression — which genes are on — makes cell types different.','expression'],
 ['What are introns?','Spacer parts of a gene that are cut out of the RNA',['The start signal of a gene','Proteins that read DNA','Parts of the cell membrane'],'Splicing removes introns and joins exons.','expression'],
 ['Chemical tags on DNA that switch genes on or off without changing the letters are called…','Epigenetic marks',['Mutations','Codons','Alleles'],'For example, DNA methylation.','expression'],
 ['A change of one letter that turns a codon into STOP is a…','Nonsense mutation',['Silent mutation','Missense mutation','Frameshift mutation'],'The protein is cut short.','mutation'],
 ['Sickle-cell disease is caused by which kind of mutation?','Missense (one amino acid changed)',['Frameshift','Extra chromosome','Repeat expansion'],'GAG → GTG swaps glutamic acid for valine in haemoglobin.','mutation'],
 ['Deleting one letter from a gene usually causes a…','Frameshift',['Silent mutation','Duplication','Nothing at all'],'Every codon after the deletion is read wrongly.','mutation'],
 ['Down syndrome is caused by…','An extra copy of chromosome 21',['A missing X chromosome','A single-letter change','A virus'],'Three copies instead of two (trisomy 21).','mutation'],
 ['About how many new mutations does each baby have that neither parent had?','About 60–70',['None','About 6','About 6 million'],'Almost all are harmless.','mutation'],
 ['Which of these can damage DNA in skin cells?','UV light from the sun',['Drinking water','Sleeping','Music'],'UV glues neighbouring T letters together.','mutation'],
 ['Carrying one copy of the sickle-cell gene protects against…','Malaria',['Flu','Diabetes','Sunburn'],'That is why it is common where malaria was common.','diversity'],
 ['About what share of their DNA letters do any two people share?','99.9%',['75%','90%','50%'],'The differences are in the remaining ~0.1%.','diversity'],
 ['Where is human genetic diversity greatest?','Africa',['Europe','Australia','South America'],'Humans have lived longest in Africa.','diversity'],
 ['Most human genetic variation is found…','Between people within the same population',['Only between continents','Only between ethnic groups','Only between men and women'],'About 85–90% is within populations.','diversity'],
 ['Tibetans’ high-altitude gene EPAS1 came from…','Denisovans',['Chimpanzees','Neanderthals in Europe','Yaks'],'An extinct human group whose DNA mixed with ancestors of Tibetans.','diversity'],
 ['Why can many adults in Europe and East Africa digest milk?','Mutations that keep the lactase gene switched on',['They drink more water','They have a bigger stomach','Everyone can digest milk'],'Different mutations spread in dairy-farming peoples — convergent evolution.','diversity'],
 ['People outside Africa carry about how much Neanderthal DNA?','1–2%',['0%','20%','50%'],'From mixing about 50,000–60,000 years ago.','diversity'],
 ['Lighter skin in low-sunlight regions helps the body make…','Vitamin D',['Vitamin C','Insulin','Iron'],'UV is needed to make vitamin D in skin.','diversity'],
 ['Natural selection means…','Individuals with helpful traits survive and reproduce more, so the traits become common',['Animals choose to change their bodies','Every individual changes during its life','Only the strongest survive, always'],'Selection works on inherited variation over generations.','evolution'],
 ['Which is evidence for evolution?','All of these',['Fossils','Shared DNA','Antibiotic-resistant bacteria'],'Fossils, DNA, anatomy and evolution we can watch today all agree.','evolution'],
 ['Birds are the living descendants of…','Dinosaurs',['Bats','Fish','Insects'],'Birds evolved from small feathered dinosaurs.','evolution'],
 ['Whales evolved from…','Land mammals related to hippos',['Sharks','Giant fish','Crocodiles'],'They returned to the sea about 50 million years ago.','evolution'],
 ['Random changes in gene frequency in a small population are called…','Genetic drift',['Natural selection','Mutation','Epigenetics'],'Drift is chance, not advantage.','evolution'],
 ['About how long ago did the dinosaurs (except birds) die out?','66 million years ago',['6,000 years ago','660 million years ago','6.6 million years ago'],'An asteroid struck Mexico.','evolution']
];
