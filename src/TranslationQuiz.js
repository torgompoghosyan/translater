import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TranslationQuiz.css';

const TranslationQuiz = () => {
  const [wordList, setWordList] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [userTranslation, setUserTranslation] = useState('');
  const [correctTranslation, setCorrectTranslation] = useState('');
  const [synonyms, setSynonyms] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [order, setOrder] = useState('random');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [answerStatus, setAnswerStatus] = useState('');

  useEffect(() => {
    const storedWords = JSON.parse(localStorage.getItem('wordList')) || [];
    setWordList(storedWords);
    const storedOrder = localStorage.getItem('order') || 'random';
    setOrder(storedOrder);
    pickWord(storedWords);
  }, []);

  const addWordToList = (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    const updatedList = [...wordList, newWord];
    setWordList(updatedList);
    localStorage.setItem('wordList', JSON.stringify(updatedList));
    setNewWord('');
    setFeedback(`The word "${newWord}" has been added to the list.`);
  };

  const pickWord = (words) => {
    if (words.length === 0) return;

    let word = '';

    if (order === 'random') {
      const randomIndex = Math.floor(Math.random() * words.length);
      word = words[randomIndex];
    } else if (order === 'alphabetical') {
      words.sort();
      word = words[0];
    } else if (order === 'sequential') {
      word = words[currentIndex];
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(currentIndex + 1); 
      } else {
        setCurrentIndex(0);
      }
    }

    setCurrentWord(word);
    getTranslationAndSynonyms(word); 
    setShowCorrectAnswer(false);
    setAnswerStatus('');
  };

  const getTranslationAndSynonyms = async (word) => {
    setLoading(true);
    try {
      const synonymsResponse = await axios.get(`https://api.datamuse.com/words`, {
        params: {
          rel_syn: word,
          max: 5,
        },
      });
      
      const synonymWords = synonymsResponse.data.map(synonym => synonym.word);
      setSynonyms(synonymWords);

      const translationRequests = [
        axios.get('https://api.mymemory.translated.net/get', {
          params: {
            q: word,
            langpair: 'en|hy',
          },
        }),
        ...synonymWords.map((synonym) =>
          axios.get('https://api.mymemory.translated.net/get', {
            params: {
              q: synonym,
              langpair: 'en|hy',
            },
          })
        ),
      ];

      const responses = await Promise.all(translationRequests);

      setCorrectTranslation(responses[0].data.responseData.translatedText);

      const synonymTranslations = responses.slice(1).map((response) => response.data.responseData.translatedText);

      const allTranslations = [correctTranslation, ...synonymTranslations];
      setSynonyms((prevSynonyms) => [...prevSynonyms, ...synonymTranslations]);

    } catch (error) {
      console.error('Error while fetching translation or synonyms:', error);
      setFeedback('Error while fetching translation or synonyms.');
    } finally {
      setLoading(false);
    }
  };

  const checkTranslation = (e) => {
    e.preventDefault();
    const normalizedUserTranslation = userTranslation.toLowerCase().trim();
    const normalizedCorrectTranslation = correctTranslation.toLowerCase().trim();

    if (normalizedUserTranslation === normalizedCorrectTranslation || synonyms.some(synonym => normalizedUserTranslation === synonym.toLowerCase())) {
      setFeedback('Your translation is correct!');
      setAnswerStatus('correct');
    } else {
      setFeedback(`Incorrect. The correct translation is: ${correctTranslation}`);
      setAnswerStatus('incorrect');
    }

    setTimeout(() => {
      setUserTranslation('');
      pickWord(wordList);
    }, 2000);
  };

  const deleteWordFromList = (wordToDelete) => {
    const updatedList = wordList.filter(word => word !== wordToDelete);
    setWordList(updatedList);
    localStorage.setItem('wordList', JSON.stringify(updatedList));
    if (wordToDelete === currentWord) {
      pickWord(updatedList);
    }
  };

  const handleShowCorrectAnswer = () => {
    setShowCorrectAnswer(true);
    setAnswerStatus('showTranslation');
  };

  const handleOrderChange = (e) => {
    const newOrder = e.target.value;
    setOrder(newOrder);
    localStorage.setItem('order', newOrder);
    pickWord(wordList);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkTranslation(e);
    }
  };

  return (
    <div className="quiz-container">
      <h1>Word Translation Quiz</h1>

      <form onSubmit={addWordToList} className="word-form">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Enter a word to add"
        />
        <button type="submit" disabled={!newWord.trim()}>
          Add Word
        </button>
      </form>

      <div>
        <label>
          Select mode:
          <select value={order} onChange={handleOrderChange}>
            <option value="random">Random</option>
            <option value="sequential">Sequential</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </label>
      </div>

      {currentWord && (
        <div>
          <h2>Translate the word: "{currentWord}"</h2>
          <form onSubmit={checkTranslation}>
            <textarea
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your translation"
            />
            <button type="submit" disabled={loading}>
              Check Translation
            </button>
          </form>
          {feedback &&  <p className={feedback[0].toLowerCase() !== 'i' ? 'feedback correct' : 'feedback incorrect'}>{feedback}</p>}
        </div>
      )}

      <div>
        <h3>Manage Words</h3>
        <h3>words in the dictionary {wordList.length}</h3>
        <select 
          onChange={(e) => deleteWordFromList(e.target.value)} 
          value={currentWord || (wordList[0] || '')}
        >
          {wordList.map((word, index) => (
            <option key={index} value={word}>{word}</option>
          ))}
        </select>
        <button onClick={() => deleteWordFromList(currentWord)}>
          Delete Word
        </button>
      </div>
    </div>
  );
};

export default TranslationQuiz;
