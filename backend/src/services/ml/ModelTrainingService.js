const tf = require('@tensorflow/tfjs-node');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class ModelTrainingService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });

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
   * Prepare training data from historical lead data
   * @returns {Promise<Object>} Training dataset
   */
  async prepareTrainingData() {
    try {
      console.log('Preparing training data...');

      // Get historical lead data with conversion outcomes
      const query = `
        SELECT
          l.id,
          l.created_at,
          l.converted_at,
          l.status,
          -- Interaction features
          COALESCE(interaction_stats.total_count, 0) as total_interactions,
          COALESCE(interaction_stats.email_count, 0) as email_interactions,
          COALESCE(interaction_stats.phone_count, 0) as phone_interactions,
          COALESCE(interaction_stats.meeting_count, 0) as meeting_interactions,
          -- Property features
          COALESCE(property_stats.avg_budget, 0) as avg_budget,
          COALESCE(property_stats.property_count, 0) as property_count,
          -- Lead profile features
          CASE WHEN l.email IS NOT NULL THEN 1 ELSE 0 END as has_email,
          CASE WHEN l.phone IS NOT NULL THEN 1 ELSE 0 END as has_phone,
          LENGTH(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')) as name_length
        FROM leads l
        LEFT JOIN (
          SELECT
            lead_id,
            COUNT(*) as total_count,
            COUNT(CASE WHEN type = 'email' THEN 1 END) as email_count,
            COUNT(CASE WHEN type = 'phone' THEN 1 END) as phone_count,
            COUNT(CASE WHEN type = 'meeting' THEN 1 END) as meeting_count
          FROM lead_interactions
          GROUP BY lead_id
        ) interaction_stats ON l.id = interaction_stats.lead_id
        LEFT JOIN (
          SELECT
            lp.lead_id,
            AVG((p.price_range_min + p.price_range_max) / 2) as avg_budget,
            COUNT(*) as property_count
          FROM lead_properties lp
          JOIN properties p ON lp.property_id = p.id
          GROUP BY lp.lead_id
        ) property_stats ON l.id = property_stats.lead_id
        WHERE l.created_at < CURRENT_DATE - INTERVAL '30 days'
        ORDER BY l.created_at DESC
        LIMIT 10000
      `;

      const result = await this.pool.query(query);
      const rawData = result.rows;

      console.log(`Retrieved ${rawData.length} training examples`);

      // Process data into features and labels
      const features = [];
      const labels = [];

      for (const row of rawData) {
        // Extract features
        const featureVector = [
          this.normalizeLeadAge(row.created_at), // Lead age (normalized)
          row.total_interactions / 100, // Normalize interaction count
          row.email_interactions / 50, // Normalize email interactions
          row.phone_interactions / 20, // Normalize phone interactions
          row.meeting_interactions / 10, // Normalize meeting interactions
          row.avg_budget / 1000000, // Normalize budget
          row.property_count / 10, // Normalize property count
          row.has_email,
          row.has_phone,
          row.name_length / 50 // Normalize name length
        ];

        // Determine label (conversion outcome)
        const isConverted = row.converted_at !== null ||
                          (row.status === 'converted');

        features.push(featureVector);
        labels.push(isConverted ? 1 : 0);
      }

      // Split into train/test sets
      const splitIndex = Math.floor(features.length * 0.8);
      const trainFeatures = features.slice(0, splitIndex);
      const trainLabels = labels.slice(0, splitIndex);
      const testFeatures = features.slice(splitIndex);
      const testLabels = labels.slice(splitIndex);

      return {
        trainFeatures: tf.tensor2d(trainFeatures),
        trainLabels: tf.tensor1d(trainLabels),
        testFeatures: tf.tensor2d(testFeatures),
        testLabels: tf.tensor1d(testLabels),
        featureCount: features[0].length,
        trainingSize: trainFeatures.length,
        testSize: testFeatures.length
      };
    } catch (error) {
      console.error('Failed to prepare training data:', error);
      throw error;
    }
  }

  /**
   * Train a baseline logistic regression model
   * @param {Object} dataset - Training dataset
   * @returns {Promise<Object>} Trained model and metrics
   */
  async trainBaselineModel(dataset) {
    try {
      console.log('Training baseline logistic regression model...');

      const model = tf.sequential();

      model.add(tf.layers.dense({
        inputShape: [dataset.featureCount],
        units: 1,
        activation: 'sigmoid'
      }));

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      const history = await model.fit(dataset.trainFeatures, dataset.trainLabels, {
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

      // Evaluate on test set
      const evaluation = model.evaluate(dataset.testFeatures, dataset.testLabels);
      const testLoss = (await evaluation[0].data())[0];
      const testAccuracy = (await evaluation[1].data())[0];

      console.log(`Baseline model - Test Loss: ${testLoss.toFixed(4)}, Test Accuracy: ${testAccuracy.toFixed(4)}`);

      return {
        model,
        type: 'baseline',
        metrics: {
          trainingAccuracy: history.history.acc[history.history.acc.length - 1],
          validationAccuracy: history.history.val_acc[history.history.val_acc.length - 1],
          testAccuracy,
          testLoss
        },
        trainingHistory: history.history
      };
    } catch (error) {
      console.error('Failed to train baseline model:', error);
      throw error;
    }
  }

  /**
   * Train an advanced gradient boosting model
   * @param {Object} dataset - Training dataset
   * @returns {Promise<Object>} Trained model and metrics
   */
  async trainAdvancedModel(dataset) {
    try {
      console.log('Training advanced neural network model...');

      const model = tf.sequential();

      // Input layer
      model.add(tf.layers.dense({
        inputShape: [dataset.featureCount],
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

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy', tf.metrics.AUC()]
      });

      const history = await model.fit(dataset.trainFeatures, dataset.trainLabels, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}, auc = ${logs.auc.toFixed(4)}`);
            }
          }
        }
      });

      // Evaluate on test set
      const evaluation = model.evaluate(dataset.testFeatures, dataset.testLabels);
      const testLoss = (await evaluation[0].data())[0];
      const testAccuracy = (await evaluation[1].data())[0];
      const testAUC = (await evaluation[2].data())[0];

      console.log(`Advanced model - Test Loss: ${testLoss.toFixed(4)}, Test Accuracy: ${testAccuracy.toFixed(4)}, Test AUC: ${testAUC.toFixed(4)}`);

      return {
        model,
        type: 'advanced',
        metrics: {
          trainingAccuracy: history.history.acc[history.history.acc.length - 1],
          validationAccuracy: history.history.val_acc[history.history.val_acc.length - 1],
          testAccuracy,
          testAUC,
          testLoss
        },
        trainingHistory: history.history
      };
    } catch (error) {
      console.error('Failed to train advanced model:', error);
      throw error;
    }
  }

  /**
   * Perform hyperparameter tuning
   * @param {Object} dataset - Training dataset
   * @returns {Promise<Object>} Best model configuration
   */
  async tuneHyperparameters(dataset) {
    try {
      console.log('Performing hyperparameter tuning...');

      const configurations = [
        { learningRate: 0.001, batchSize: 32, epochs: 50 },
        { learningRate: 0.01, batchSize: 32, epochs: 50 },
        { learningRate: 0.001, batchSize: 64, epochs: 50 },
        { learningRate: 0.001, batchSize: 32, epochs: 100 }
      ];

      let bestModel = null;
      let bestAccuracy = 0;
      let bestConfig = null;

      for (const config of configurations) {
        console.log(`Testing configuration: ${JSON.stringify(config)}`);

        const model = tf.sequential();
        model.add(tf.layers.dense({
          inputShape: [dataset.featureCount],
          units: 32,
          activation: 'relu'
        }));
        model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

        model.compile({
          optimizer: tf.train.adam(config.learningRate),
          loss: 'binaryCrossentropy',
          metrics: ['accuracy']
        });

        await model.fit(dataset.trainFeatures, dataset.trainLabels, {
          epochs: config.epochs,
          batchSize: config.batchSize,
          verbose: 0
        });

        const evaluation = model.evaluate(dataset.testFeatures, dataset.testLabels);
        const accuracy = (await evaluation[1].data())[0];

        console.log(`Configuration accuracy: ${accuracy.toFixed(4)}`);

        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestModel = model;
          bestConfig = config;
        } else {
          model.dispose();
        }
      }

      console.log(`Best configuration: ${JSON.stringify(bestConfig)} with accuracy: ${bestAccuracy.toFixed(4)}`);

      return {
        model: bestModel,
        config: bestConfig,
        accuracy: bestAccuracy
      };
    } catch (error) {
      console.error('Failed to tune hyperparameters:', error);
      throw error;
    }
  }

  /**
   * Save trained model to database and filesystem
   * @param {Object} trainedModel - Trained model object
   * @param {string} modelType - Type of model (baseline, advanced, ensemble)
   * @returns {Promise<string>} Model ID
   */
  async saveModel(trainedModel, modelType) {
    try {
      const modelId = `model_${Date.now()}_${modelType}`;
      const version = '1.0.0';

      // Save model to TensorFlow.js format
      const modelPath = path.join(this.modelsDir, modelId);
      await fs.mkdir(modelPath, { recursive: true });

      await trainedModel.model.save(`file://${modelPath}`);

      // Read model files
      const modelJsonPath = path.join(modelPath, 'model.json');
      const weightsPath = path.join(modelPath, 'weights.bin');

      const modelJson = await fs.readFile(modelJsonPath, 'utf8');
      const weightsData = await fs.readFile(weightsPath);

      // Save to database
      const query = `
        INSERT INTO ml_models (
          model_id, model_type, version, status, accuracy, precision, recall, f1_score,
          training_date, model_data, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const metrics = trainedModel.metrics;
      await this.pool.query(query, [
        modelId,
        modelType,
        version,
        'active',
        metrics.testAccuracy || 0,
        0, // precision (would need to calculate)
        0, // recall (would need to calculate)
        0, // f1_score (would need to calculate)
        new Date(),
        JSON.stringify({
          model_json: JSON.parse(modelJson),
          weights: weightsData.toString('base64')
        }),
        JSON.stringify({
          trainingConfig: trainedModel.config || {},
          featureCount: trainedModel.featureCount || 0,
          trainingSize: trainedModel.trainingSize || 0
        })
      ]);

      console.log(`Model saved with ID: ${modelId}`);
      return modelId;
    } catch (error) {
      console.error('Failed to save model:', error);
      throw error;
    }
  }

  /**
   * Validate training data quality
   * @param {Object} dataset - Training dataset
   * @returns {Promise<Object>} Validation results
   */
  async validateTrainingData(dataset) {
    try {
      const features = await dataset.trainFeatures.array();
      const labels = await dataset.trainLabels.array();

      // Check for data quality issues
      const validation = {
        totalSamples: features.length,
        featureCount: features[0].length,
        labelDistribution: {
          positive: labels.filter(l => l === 1).length,
          negative: labels.filter(l => l === 0).length
        },
        classBalance: labels.filter(l => l === 1).length / labels.length,
        missingValues: this.checkMissingValues(features),
        featureCorrelations: this.calculateFeatureCorrelations(features)
      };

      // Check for potential issues
      validation.issues = [];

      if (validation.classBalance < 0.1 || validation.classBalance > 0.9) {
        validation.issues.push('Class imbalance detected - consider resampling');
      }

      if (validation.missingValues > 0.1) {
        validation.issues.push('High percentage of missing values detected');
      }

      return validation;
    } catch (error) {
      console.error('Failed to validate training data:', error);
      throw error;
    }
  }

  /**
   * Trigger automated model retraining
   * @returns {Promise<boolean>} Success status
   */
  async triggerRetraining() {
    try {
      console.log('Starting automated model retraining...');

      // Prepare training data
      const dataset = await this.prepareTrainingData();

      // Validate data quality
      const validation = await this.validateTrainingData(dataset);
      console.log('Data validation results:', validation);

      if (validation.issues.length > 0) {
        console.warn('Data quality issues detected:', validation.issues);
      }

      // Train baseline model
      const baselineModel = await this.trainBaselineModel(dataset);

      // Train advanced model
      const advancedModel = await this.trainAdvancedModel(dataset);

      // Compare models and select best
      const bestModel = advancedModel.metrics.testAccuracy > baselineModel.metrics.testAccuracy
        ? advancedModel
        : baselineModel;

      // Save the best model
      const modelId = await this.saveModel(bestModel, bestModel.type);

      // Update model status
      await this.updateModelStatus(modelId, 'active');

      // Clean up tensors
      dataset.trainFeatures.dispose();
      dataset.trainLabels.dispose();
      dataset.testFeatures.dispose();
      dataset.testLabels.dispose();

      console.log(`Model retraining completed. New model: ${modelId}`);
      return true;
    } catch (error) {
      console.error('Automated retraining failed:', error);
      return false;
    }
  }

  /**
   * Update model status
   * @param {string} modelId - Model ID
   * @param {string} status - New status
   */
  async updateModelStatus(modelId, status) {
    const query = 'UPDATE ml_models SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE model_id = $2';
    await this.pool.query(query, [status, modelId]);
  }

  // Helper methods

  normalizeLeadAge(createdAt) {
    const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(ageInDays / 365, 1); // Normalize to 0-1 range (max 1 year)
  }

  checkMissingValues(features) {
    let totalValues = 0;
    let missingValues = 0;

    for (const featureVector of features) {
      for (const value of featureVector) {
        totalValues++;
        if (isNaN(value) || value === null || value === undefined) {
          missingValues++;
        }
      }
    }

    return missingValues / totalValues;
  }

  calculateFeatureCorrelations(features) {
    // Simple correlation calculation between first few features
    const correlations = [];
    const numFeatures = Math.min(features[0].length, 5);

    for (let i = 0; i < numFeatures; i++) {
      for (let j = i + 1; j < numFeatures; j++) {
        const correlation = this.calculateCorrelation(
          features.map(f => f[i]),
          features.map(f => f[j])
        );
        correlations.push({ feature1: i, feature2: j, correlation });
      }
    }

    return correlations;
  }

  calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = ModelTrainingService;