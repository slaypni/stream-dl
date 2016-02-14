import gulp from 'gulp';
import gutil from 'gulp-util';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import runSequence from 'run-sequence';

const $ = gulpLoadPlugins();

gulp.task('coffee', () => {
  gulp.src('./src/*.coffee')
    .pipe($.coffee({})).on('error', gutil.log)
    .pipe(gulp.dest('dist'));
});

gulp.task('cson', () => {
  gulp.src('./src/*.cson')
    .pipe($.cson())
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('watch', ['babel', 'html'], () => {
  gulp.watch(['src/*.coffee'], [coffee]);
});

gulp.task('build', (cb) => {
  runSequence('coffee', 'cson', cb);
});

gulp.task('default', ['clean'], (cb) => {
  runSequence('build', cb);
});
