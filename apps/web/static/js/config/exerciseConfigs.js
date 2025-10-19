/**
 * Exercise Configurations Loader
 * ===============================
 *
 * Sistema dinâmico de carregamento de configurações de exercícios.
 * Carrega configurações de arquivos JSON individuais em vez de hardcoded.
 *
 * Estrutura:
 * - /exercises/{exerciseId}/config.json - configuração do exercício
 * - /exercises/{exerciseId}/validator.js - validador heurístico (opcional)
 * - /exercises/{exerciseId}/{exerciseId}_autoencoder.onnx - modelo ML
 */

// Cache de configurações carregadas
const ExerciseConfigsCache = {};

/**
 * Carrega configuração de um exercício do arquivo JSON
 */
async function loadExerciseConfig(exerciseId) {
    // Verifica cache
    if (ExerciseConfigsCache[exerciseId]) {
        return ExerciseConfigsCache[exerciseId];
    }

    try {
        const configPath = `./exercises/${exerciseId}/config.json`;

        const response = await fetch(configPath);

        if (!response.ok) {
            throw new Error(`Config não encontrada: ${configPath}`);
        }

        const config = await response.json();

        // Armazena no cache
        ExerciseConfigsCache[exerciseId] = config;

        return config;

    } catch (error) {
        return null;
    }
}

/**
 * Helper para obter configuração de exercício (com suporte a carregamento dinâmico)
 * Mantém compatibilidade com código existente que usa getExerciseConfig de forma síncrona
 */
function getExerciseConfig(exerciseName) {
    // Verifica se já está no cache
    if (ExerciseConfigsCache[exerciseName]) {
        return ExerciseConfigsCache[exerciseName];
    }

    // Se não está no cache, retorna null e avisa para usar loadExerciseConfig
    return null;
}

/**
 * Helper para listar exercícios disponíveis
 * Lê do exercises.json na raiz do projeto
 */
async function getAvailableExercises() {
    try {
        const response = await fetch('./exercises.json');
        if (!response.ok) {
            throw new Error('exercises.json não encontrado');
        }

        const data = await response.json();
        return data.exercises || [];

    } catch (error) {
        // Fallback para lista hardcoded
        return ['squat', 'lunge', 'pushup', 'plank'];
    }
}

/**
 * Helper para validar se exercício está disponível
 */
async function isExerciseAvailable(exerciseName) {
    const exercises = await getAvailableExercises();
    return exercises.some(ex => {
        if (typeof ex === 'string') {
            return ex === exerciseName;
        }
        return ex.id === exerciseName;
    });
}

/**
 * Pré-carrega configurações de múltiplos exercícios
 */
async function preloadExerciseConfigs(exerciseIds) {

    const promises = exerciseIds.map(id => loadExerciseConfig(id));
    const results = await Promise.allSettled(promises);

    const loaded = results.filter(r => r.status === 'fulfilled').length;

    return results;
}

// Export
if (typeof window !== 'undefined') {
    window.ExerciseConfigsCache = ExerciseConfigsCache;
    window.loadExerciseConfig = loadExerciseConfig;
    window.getExerciseConfig = getExerciseConfig;
    window.getAvailableExercises = getAvailableExercises;
    window.isExerciseAvailable = isExerciseAvailable;
    window.preloadExerciseConfigs = preloadExerciseConfigs;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ExerciseConfigsCache,
        loadExerciseConfig,
        getExerciseConfig,
        getAvailableExercises,
        isExerciseAvailable,
        preloadExerciseConfigs
    };
}
