const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');

class TensorFlowService {
  constructor() {
    this.models = new Map();
    this.modelsDir = path.join(__dirname, '../../ml/models');
    this.ensureModelsDirectory();
  }

  /**
   * Ensure models directory exists
   */
  async ensureModelsDirectory() {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create models directory:', error);
    }
  }

  /**
   * Create and train a baseline logistic regression model
   * @param {Array} features - Training features
   * @param {Array} labels - Training labels
   * @returns {Promise<Object>} Trained model and metrics
   */
  async createBaselineModel(features, labels) {
    try {
      console.log('Creating baseline logistic regression model...');

      // Convert data to tensors
      const trainFeatures = tf.tensor2d(features);
      const trainLabels = tf.tensor1d(labels, 'int32');

      // Create model
      const model = tf.sequential();

      model.add(tf.layers.dense({
        inputShape: [features[0].length],
        units: 1,
        activation: 'sigmoid'
      }));

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // Train model
      const history = await model.fit(trainFeatures, trainLabels, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
            }
          }
        }
      });

      // Evaluate model
      const predictions = model.predict(trainFeatures);
      const predictionsData = await predictions.data();

      // Calculate metrics
      const metrics = this.calculateMetrics(labels, Array.from(predictionsData));

      // Clean up tensors
      trainFeatures.dispose();
      trainLabels.dispose();
      predictions.dispose();

      return {
        model,
        type: 'baseline',
        metrics: {
          accuracy: metrics.accuracy,
          precision: metrics.precision,
          recall: metrics.recall,
          f1Score: metrics.f1Score,
          trainingHistory: history.history
        }
      };
    } catch (error) {
      console.error('Failed to create baseline model:', error);
      throw error;
    }
  }

  /**
   * Create and train an advanced neural network model
   * @param {Array} features - Training features
   * @param {Array} labels - Training labels
   * @returns {Promise<Object>} Trained model and metrics
   */
  async createAdvancedModel(features, labels) {
    try {
      console.log('Creating advanced neural network model...');

      // Convert data to tensors
      const trainFeatures = tf.tensor2d(features);
      const trainLabels = tf.tensor1d(labels, 'int32');

      // Create model
      const model = tf.sequential();

      // Input layer
      model.add(tf.layers.dense({
        inputShape: [features[0].length],
        units: 64,
        activation: 'relu'
      }));

      // Hidden layers
      model.add(tf.layers.dropout({ rate: 0.2 }));
      model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
      model.add(tf.layers.dropout({ rate: 0.2 }));
      model.add(tf.layers.dense({ units: 16, activation: 'relu' }));

      // Output layer
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', tf.metrics.AUC()]
      });

      // Train model
      const history = await model.fit(trainFeatures, trainLabels, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}, auc = ${logs.auc?.toFixed(4) || 'N/A'}`);
            }
          }
        }
      });

      // Evaluate model
      const predictions = model.predict(trainFeatures);
      const predictionsData = await predictions.data();

      // Calculate metrics
      const metrics = this.calculateMetrics(labels, Array.from(predictionsData));

      // Clean up tensors
      trainFeatures.dispose();
      trainLabels.dispose();
      predictions.dispose();

      return {
        model,
        type: 'advanced',
        metrics: {
          accuracy: metrics.accuracy,
          precision: metrics.precision,
          recall: metrics.recall,
          f1Score: metrics.f1Score,
          auc: history.history.auc ? history.history.auc[history.history.auc.length - 1] : null,
          trainingHistory: history.history
        }
      };
    } catch (error) {
      console.error('Failed to create advanced model:', error);
      throw error;
    }
  }

  /**
   * Make prediction with a trained model
   * @param {Object} model - Trained TensorFlow model
   * @param {Array} features - Input features
   * @returns {Promise<number>} Prediction score
   */
  async predict(model, features) {
    try {
      // Convert features to tensor
      const inputTensor = tf.tensor2d([features], [1, features.length]);

      // Make prediction
      const prediction = model.predict(inputTensor);
      const predictionData = await prediction.data();

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      return predictionData[0];
    } catch (error) {
      console.error('Failed to make prediction:', error);
      throw error;
    }
  }

  /**
   * Make batch predictions
   * @param {Object} model - Trained TensorFlow model
   * @param {Array} featureBatch - Array of feature arrays
   * @returns {Promise<Array>} Array of prediction scores
   */
  async predictBatch(model, featureBatch) {
    try {
      // Convert features to tensor
      const inputTensor = tf.tensor2d(featureBatch, [featureBatch.length, featureBatch[0].length]);

      // Make predictions
      const predictions = model.predict(inputTensor);
      const predictionsData = await predictions.data();

      // Clean up tensors
      inputTensor.dispose();
      predictions.dispose();

      return Array.from(predictionsData);
    } catch (error) {
      console.error('Failed to make batch predictions:', error);
      throw error;
    }
  }

  /**
   * Save model to filesystem
   * @param {Object} model - Trained TensorFlow model
   * @param {string} modelId - Model identifier
   * @returns {Promise<Object>} Model save result
   */
  async saveModel(model, modelId) {
    try {
      const modelPath = path.join(this.modelsDir, modelId);
      await fs.mkdir(modelPath, { recursive: true });

      // Save model
      await model.save(`file://${modelPath}`);

      // Read saved files
      const modelJsonPath = path.join(modelPath, 'model.json');
      const weightsPath = path.join(modelPath, 'weights.bin');

      const modelJson = await fs.readFile(modelJsonPath, 'utf8');
      const weightsData = await fs.readFile(weightsPath);

      return {
        modelJson: JSON.parse(modelJson),
        weightsData: weightsData.toString('base64'),
        modelPath
      };
    } catch (error) {
      console.error('Failed to save model:', error);
      throw error;
    }
  }

  /**
   * Load model from saved data
   * @param {Object} modelData - Model data from database
   * @returns {Promise<Object>} Loaded TensorFlow model
   */
  async loadModel(modelData) {
    try {
      // Create temporary files
      const tempDir = path.join(this.modelsDir, 'temp_' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });

      const modelJsonPath = path.join(tempDir, 'model.json');
      const weightsPath = path.join(tempDir, 'weights.bin');

      // Write model files
      await fs.writeFile(modelJsonPath, JSON.stringify(modelData.modelJson));
      await fs.writeFile(weightsPath, Buffer.from(modelData.weightsData, 'base64'));

      // Load model
      const model = await tf.loadLayersModel(`file://${tempDir}/model.json`);

      // Clean up temporary files
      await fs.rm(tempDir, { recursive: true, force: true });

      return model;
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Calculate model performance metrics
   * @param {Array} actual - Actual labels
   * @param {Array} predicted - Predicted scores
   * @returns {Object} Performance metrics
   */
  calculateMetrics(actual, predicted) {
    try {
      // Convert predictions to binary (threshold 0.5)
      const binaryPredictions = predicted.map(p => p >= 0.5 ? 1 : 0);

      // Calculate confusion matrix
      let truePositives = 0, falsePositives = 0, trueNegatives = 0, falseNegatives = 0;

      for (let i = 0; i < actual.length; i++) {
        const actualLabel = actual[i];
        const predictedLabel = binaryPredictions[i];

        if (predictedLabel === 1 && actualLabel === 1) truePositives++;
        else if (predictedLabel === 1 && actualLabel === 0) falsePositives++;
        else if (predictedLabel === 0 && actualLabel === 0) trueNegatives++;
        else if (predictedLabel === 0 && actualLabel === 1) falseNegatives++;
      }

      // Calculate metrics
      const accuracy = (truePositives + trueNegatives) / actual.length;
      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / (truePositives + falseNegatives) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

      return {
        accuracy,
        precision,
        recall,
        f1Score,
        confusionMatrix: {
          truePositives,
          falsePositives,
          trueNegatives,
          falseNegatives
        }
      };
    } catch (error) {
      console.error('Failed to calculate metrics:', error);
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        confusionMatrix: {
          truePositives: 0,
          falsePositives: 0,
          trueNegatives: 0,
          falseNegatives: 0
        }
      };
    }
  }

  /**
   * Perform cross-validation
   * @param {Array} features - Training features
   * @param {Array} labels - Training labels
   * @param {number} folds - Number of CV folds
   * @returns {Promise<Object>} Cross-validation results
   */
  async crossValidate(features, labels, folds = 5) {
    try {
      const foldSize = Math.floor(features.length / folds);
      const scores = [];

      for (let i = 0; i < folds; i++) {
        const testStart = i * foldSize;
        const testEnd = (i + 1) * foldSize;

        // Split data
        const testFeatures = features.slice(testStart, testEnd);
        const testLabels = labels.slice(testStart, testEnd);
        const trainFeatures = [...features.slice(0, testStart), ...features.slice(testEnd)];
        const trainLabels = [...labels.slice(0, testStart), ...labels.slice(testEnd)];

        // Train model
        const { model } = await this.createBaselineModel(trainFeatures, trainLabels);

        // Test model
        const predictions = await this.predictBatch(model, testFeatures);
        const metrics = this.calculateMetrics(testLabels, predictions);

        scores.push(metrics.accuracy);

        // Clean up model
        model.dispose();
      }

      const meanAccuracy = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const stdAccuracy = Math.sqrt(
        scores.reduce((sum, score) => sum + Math.pow(score - meanAccuracy, 2), 0) / scores.length
      );

      return {
        meanAccuracy,
        stdAccuracy,
        foldScores: scores,
        folds: folds
      };
    } catch (error) {
      console.error('Failed to perform cross-validation:', error);
      throw error;
    }
  }

  /**
   * Get model summary information
   * @param {Object} model - TensorFlow model
   * @returns {Promise<Object>} Model summary
   */
  async getModelSummary(model) {
    try {
      const summary = [];
      let totalParams = 0;

      // Get layer information
      for (let i = 0; i < model.layers.length; i++) {
        const layer = model.layers[i];
        const outputShape = layer.outputShape;
        const params = this.countLayerParameters(layer);

        summary.push({
          layerIndex: i,
          layerName: layer.name,
          layerType: layer.constructor.name,
          outputShape: outputShape,
          parameters: params
        });

        totalParams += params;
      }

      return {
        layers: summary,
        totalParameters: totalParams,
        inputShape: model.inputs[0].shape,
        outputShape: model.outputs[0].shape
      };
    } catch (error) {
      console.error('Failed to get model summary:', error);
      return { layers: [], totalParameters: 0 };
    }
  }

  /**
   * Count parameters in a layer
   * @param {Object} layer - TensorFlow layer
   * @returns {number} Parameter count
   */
  countLayerParameters(layer) {
    try {
      let params = 0;

      if (layer.weights) {
        for (const weight of layer.weights) {
          const shape = weight.shape;
          params += shape.reduce((product, dim) => product * dim, 1);
        }
      }

      return params;
    } catch (error) {
      console.error('Failed to count layer parameters:', error);
      return 0;
    }
  }

  /**
   * Validate model input
   * @param {Object} model - TensorFlow model
   * @param {Array} features - Input features
   * @returns {boolean} Validation result
   */
  validateModelInput(model, features) {
    try {
      const expectedShape = model.inputs[0].shape;
      const actualShape = [1, features.length];

      // Check if input shape matches expected shape
      return actualShape[1] === expectedShape[1];
    } catch (error) {
      console.error('Failed to validate model input:', error);
      return false;
    }
  }

  /**
   * Clean up TensorFlow memory
   * @param {Object} model - Model to dispose
   */
  disposeModel(model) {
    try {
      if (model && typeof model.dispose === 'function') {
        model.dispose();
      }
    } catch (error) {
      console.error('Failed to dispose model:', error);
    }
  }

  /**
   * Get TensorFlow.js version and capabilities
   * @returns {Object} TF.js information
   */
  getTensorFlowInfo() {
    return {
      version: tf.version.tfjs,
      backend: tf.getBackend(),
      isUsingGPU: tf.getBackend() === 'webgl' || tf.getBackend() === 'tensorflow',
      memoryInfo: tf.memory()
    };
  }

  /**
   * Clean up all loaded models
   */
  disposeAllModels() {
    try {
      for (const [modelId, modelInfo] of this.models) {
        if (modelInfo.model && typeof modelInfo.model.dispose === 'function') {
          modelInfo.model.dispose();
        }
      }
      this.models.clear();
      console.log('All TensorFlow models disposed');
    } catch (error) {
      console.error('Failed to dispose all models:', error);
    }
  }
}

module.exports = TensorFlowService;