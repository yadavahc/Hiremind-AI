// ============================================================================
// Skill & concept ontology
// ----------------------------------------------------------------------------
// The JD is explicit: "the right answer is NOT find candidates whose skills
// section contains the most AI keywords." So the engine reasons over *concept
// groups* and *evidence in career history* rather than literal keyword matches.
// Each concept group has canonical terms + aliases that map noisy profile text
// onto the same underlying competency.
// ============================================================================

export interface ConceptGroup {
  id: string;
  label: string;
  /** Weight toward the role (how decisive this competency is for THIS JD). */
  weight: number;
  terms: string[];
}

export const CONCEPT_GROUPS: ConceptGroup[] = [
  {
    id: "embeddings_retrieval",
    label: "Embeddings & Retrieval",
    weight: 1.0,
    terms: [
      "embedding", "embeddings", "sentence-transformers", "sentence transformers",
      "bge", "e5", "openai embeddings", "dense retrieval", "retrieval",
      "semantic search", "nearest neighbor", "ann", "knn", "text embedding",
    ],
  },
  {
    id: "vector_db",
    label: "Vector DB / Hybrid Search",
    weight: 1.0,
    terms: [
      "vector database", "vector db", "faiss", "pinecone", "weaviate", "qdrant",
      "milvus", "elasticsearch", "opensearch", "hybrid search", "vector search",
      "annoy", "hnsw", "lucene", "solr",
    ],
  },
  {
    id: "ranking_systems",
    label: "Ranking / Recsys",
    weight: 1.0,
    terms: [
      "ranking", "learning to rank", "ltr", "recommendation", "recommender",
      "recsys", "search relevance", "bm25", "tf-idf", "cross-encoder",
      "re-ranking", "reranking", "personalization", "matching",
    ],
  },
  {
    id: "evaluation",
    label: "Ranking Evaluation",
    weight: 0.9,
    terms: [
      "ndcg", "mrr", "map", "mean average precision", "precision@k", "recall@k",
      "a/b test", "ab test", "ab testing", "offline evaluation", "online evaluation",
      "eval framework", "evaluation framework", "metrics", "relevance judgment",
    ],
  },
  {
    id: "llm",
    label: "LLMs & Fine-tuning",
    weight: 0.85,
    terms: [
      "llm", "large language model", "fine-tuning", "fine tuning", "lora", "qlora",
      "peft", "rlhf", "transformer", "transformers", "gpt", "bert", "prompt engineering",
      "instruction tuning", "distillation",
    ],
  },
  {
    id: "rag",
    label: "RAG",
    weight: 0.7,
    terms: [
      "rag", "retrieval augmented generation", "retrieval-augmented", "langchain",
      "llamaindex", "context window", "grounding", "chunking",
    ],
  },
  {
    id: "nlp_ir",
    label: "NLP / Information Retrieval",
    weight: 0.9,
    terms: [
      "nlp", "natural language processing", "information retrieval", "ir",
      "text classification", "named entity", "ner", "tokenization", "word2vec",
      "topic modeling", "text mining", "question answering",
    ],
  },
  {
    id: "python_eng",
    label: "Python & Engineering",
    weight: 0.8,
    terms: [
      "python", "pytorch", "tensorflow", "scikit-learn", "sklearn", "numpy",
      "pandas", "spark", "pyspark", "airflow", "docker", "kubernetes", "fastapi",
      "microservices", "production", "deployment", "mlops", "ci/cd",
    ],
  },
  {
    id: "ltr_models",
    label: "ML Modeling",
    weight: 0.6,
    terms: [
      "xgboost", "lightgbm", "gradient boosting", "random forest", "neural network",
      "deep learning", "machine learning", "model training", "feature engineering",
    ],
  },
  {
    id: "scale_systems",
    label: "Distributed / Scale",
    weight: 0.5,
    terms: [
      "distributed systems", "scalability", "low latency", "high throughput",
      "inference optimization", "kafka", "streaming", "data pipeline",
    ],
  },
];

/** Off-target specializations the JD explicitly does not want. */
export const OFF_TARGET_TERMS = [
  "computer vision", "image classification", "object detection", "opencv",
  "speech recognition", "tts", "text to speech", "asr", "robotics", "slam",
  "autonomous", "lidar", "photoshop", "illustrator", "graphic design",
  "video editing", "3d modeling",
];

/** Pure-research markers (no production) — soft anti-signal. */
export const RESEARCH_ONLY_TERMS = [
  "phd thesis", "postdoc", "research scientist", "academic", "publication",
  "peer-reviewed", "research lab", "dissertation",
];

export const CONSULTING_FIRMS = [
  "tcs", "tata consultancy", "infosys", "wipro", "accenture", "cognizant",
  "capgemini", "hcl", "tech mahindra", "mindtree", "ltimindtree", "ltinfotech",
  "deloitte", "ibm global services",
];

export const LEADERSHIP_TERMS = [
  "led", "lead", "mentored", "managed", "owned", "architected", "drove",
  "spearheaded", "built the team", "hired", "tech lead", "staff", "principal",
  "head of", "founding",
];

export const STARTUP_SIZES = new Set(["1-10", "11-50", "51-200"]);
export const PRODUCT_INDUSTRY_HINTS = [
  "product", "saas", "ai", "artificial intelligence", "software", "internet",
  "technology", "fintech", "e-commerce", "marketplace", "platform",
];

/** Normalize a raw token blob for matching. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#./@&\s-]/g, " ").replace(/\s+/g, " ").trim();
}
